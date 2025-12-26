
import { Inject, Injectable, BadRequestException, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class ProductsService implements OnModuleInit {
    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    async onModuleInit() {
        await this.createTable();
    }

    // Create products table
    async createTable() {
        const query = `
      CREATE TABLE IF NOT EXISTS products (
        product_id SERIAL PRIMARY KEY,
        farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        rice_type VARCHAR(20) NOT NULL CHECK (rice_type IN ('MILLED', 'UNMILLED_PADDY')),
        variety_name VARCHAR(255) NOT NULL,
        description TEXT,
        price_per_kg DECIMAL(10, 2) NOT NULL,
        available_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
        quantity_unit VARCHAR(10) DEFAULT 'KG' CHECK (quantity_unit IN ('KG', 'SACKS')),
        status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_images (
        image_id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        image_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_sack_sizes (
        sack_size_id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        size_kg DECIMAL(10, 2) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_products_farmer_id ON products(farmer_id);
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
      CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_sack_sizes_product_id ON product_sack_sizes(product_id);

      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_status_check' AND conrelid = 'products'::regclass) THEN
          ALTER TABLE products DROP CONSTRAINT products_status_check;
        END IF;
        ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED'));
      END $$;

      DO $$ 
      BEGIN
         UPDATE products SET status = 'ARCHIVED' WHERE status = 'DELETED';
      END $$;
    `;

        try {
            await this.pool.query(query);
            console.log('✅ Products tables created/verified');
        } catch (error) {
            console.error('❌ Error creating products tables:', error);
        }
    }

    async isFarmerVerified(farmerId: number) {
        const result = await this.pool.query(
            `SELECT verification_status FROM profiles WHERE user_id = $1`,
            [farmerId]
        );
        return result.rows[0]?.verification_status === 'APPROVED';
    }

    async checkFarmerVerification(farmerId: number) {
        const isVerified = await this.isFarmerVerified(farmerId);
        if (!isVerified) {
            throw new Error('Only verified farmers can manage products');
        }
    }

    // Create product
    async create(farmerId: number, productData: any) {
        await this.checkFarmerVerification(farmerId);

        const { rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, images, sack_sizes } = productData;

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Insert product
            const productResult = await client.query(`
          INSERT INTO products (farmer_id, rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING product_id
        `, [farmerId, rice_type, variety_name, description || null, price_per_kg, available_quantity, quantity_unit || 'KG']);

            const productId = productResult.rows[0].product_id;

            // Insert images
            if (images && images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    await client.query(`
              INSERT INTO product_images (product_id, image_url, image_order)
              VALUES ($1, $2, $3)
            `, [productId, images[i], i]);
                }
            }

            // Insert sack sizes
            if (sack_sizes && sack_sizes.length > 0) {
                for (const sack of sack_sizes) {
                    await client.query(`
              INSERT INTO product_sack_sizes (product_id, size_kg, price)
              VALUES ($1, $2, $3)
            `, [productId, sack.size_kg, sack.price]);
                }
            }

            await client.query('COMMIT');
            return await this.findById(productId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async findById(productId: number) {
        const productResult = await this.pool.query(`SELECT * FROM products WHERE product_id = $1`, [productId]);
        if (productResult.rows.length === 0) return null;

        const product = productResult.rows[0];

        const imagesResult = await this.pool.query(`
      SELECT image_url, image_order FROM product_images
      WHERE product_id = $1 ORDER BY image_order ASC
    `, [productId]);
        product.images = imagesResult.rows.map(r => r.image_url);

        const sacksResult = await this.pool.query(`
      SELECT size_kg, price FROM product_sack_sizes
      WHERE product_id = $1 ORDER BY size_kg ASC
    `, [productId]);
        product.sack_sizes = sacksResult.rows;

        return product;
    }

    async findByFarmerId(farmerId: number, includeInactive = false) {
        let query = `
      SELECT p.*, 
        (SELECT array_agg(image_url ORDER BY image_order) FROM product_images WHERE product_id = p.product_id) as images,
        (SELECT json_agg(json_build_object('size_kg', size_kg, 'price', price) ORDER BY size_kg) FROM product_sack_sizes WHERE product_id = p.product_id) as sack_sizes
      FROM products p
      WHERE p.farmer_id = $1
    `;

        if (!includeInactive) {
            query += ` AND p.status != 'ARCHIVED'`;
        }
        query += ` ORDER BY p.created_at DESC`;

        const result = await this.pool.query(query, [farmerId]);
        return result.rows;
    }

    async findArchivedByFarmerId(farmerId: number) {
        const query = `
      SELECT p.*, 
        (SELECT array_agg(image_url ORDER BY image_order) FROM product_images WHERE product_id = p.product_id) as images,
        (SELECT json_agg(json_build_object('size_kg', size_kg, 'price', price) ORDER BY size_kg) FROM product_sack_sizes WHERE product_id = p.product_id) as sack_sizes
      FROM products p
      WHERE p.farmer_id = $1 AND p.status = 'ARCHIVED'
      ORDER BY p.updated_at DESC
    `;
        const result = await this.pool.query(query, [farmerId]);
        return result.rows;
    }

    async update(productId: number, farmerId: number, productData: any) {
        await this.checkFarmerVerification(farmerId);

        const { rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, status, images, sack_sizes } = productData;
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let paramCount = 1;

            if (rice_type !== undefined) { updateFields.push(`rice_type = $${paramCount++}`); updateValues.push(rice_type); }
            if (variety_name !== undefined) { updateFields.push(`variety_name = $${paramCount++}`); updateValues.push(variety_name); }
            if (description !== undefined) { updateFields.push(`description = $${paramCount++}`); updateValues.push(description); }
            if (price_per_kg !== undefined) { updateFields.push(`price_per_kg = $${paramCount++}`); updateValues.push(price_per_kg); }
            if (available_quantity !== undefined) { updateFields.push(`available_quantity = $${paramCount++}`); updateValues.push(available_quantity); }
            if (quantity_unit !== undefined) { updateFields.push(`quantity_unit = $${paramCount++}`); updateValues.push(quantity_unit); }
            if (status !== undefined) { updateFields.push(`status = $${paramCount++}`); updateValues.push(status); }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

            if (updateFields.length > 1) {
                updateValues.push(productId, farmerId);
                await client.query(`
               UPDATE products SET ${updateFields.join(', ')}
               WHERE product_id = $${paramCount++} AND farmer_id = $${paramCount++}
            `, updateValues);
            }

            if (images !== undefined) {
                await client.query(`DELETE FROM product_images WHERE product_id = $1`, [productId]);
                if (images.length > 0) {
                    for (let i = 0; i < images.length; i++) {
                        await client.query(`INSERT INTO product_images (product_id, image_url, image_order) VALUES ($1, $2, $3)`, [productId, images[i], i]);
                    }
                }
            }

            if (sack_sizes !== undefined) {
                await client.query(`DELETE FROM product_sack_sizes WHERE product_id = $1`, [productId]);
                if (sack_sizes.length > 0) {
                    for (const sack of sack_sizes) {
                        await client.query(`INSERT INTO product_sack_sizes (product_id, size_kg, price) VALUES ($1, $2, $3)`, [productId, sack.size_kg, sack.price]);
                    }
                }
            }

            await client.query('COMMIT');
            return await this.findById(productId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async archive(productId: number, farmerId: number) {
        const result = await this.pool.query(`
        UPDATE products SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $1 AND farmer_id = $2
        RETURNING product_id
      `, [productId, farmerId]);
        return result.rows[0];
    }

    async unarchive(productId: number, farmerId: number) {
        const result = await this.pool.query(`
        UPDATE products SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $1 AND farmer_id = $2 AND status = 'ARCHIVED'
        RETURNING product_id
      `, [productId, farmerId]);
        return result.rows[0];
    }

    async updateInventory(productId: number, farmerId: number, quantity: number) {
        const result = await this.pool.query(`
        UPDATE products SET available_quantity = $1, updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $2 AND farmer_id = $3
        RETURNING product_id, available_quantity
       `, [quantity, productId, farmerId]);
        return result.rows[0];
    }
}
