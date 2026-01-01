
import { Inject, Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class ConsumerService implements OnModuleInit {
    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    async onModuleInit() {
        await this.createTables();
    }

    async createTables() {
        // Create tables if they don't exist (preserves existing data)
        const tables = [
            `CREATE TABLE IF NOT EXISTS consumer_addresses (
                address_id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                label VARCHAR(50) NOT NULL,
                full_address TEXT NOT NULL,
                city VARCHAR(100),
                state VARCHAR(100),
                postal_code VARCHAR(20),
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS payment_methods (
                payment_id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                payment_type VARCHAR(20) NOT NULL,
                card_number_last4 VARCHAR(4),
                card_holder_name VARCHAR(100),
                expiry_month INTEGER,
                expiry_year INTEGER,
                upi_id VARCHAR(100),
                wallet_provider VARCHAR(50),
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS cart_items (
                cart_item_id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL DEFAULT 1,
                sack_size_kg INTEGER DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_id, sack_size_kg)
            )`,
            `CREATE TABLE IF NOT EXISTS orders (
                order_id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                farmer_id INTEGER REFERENCES users(user_id),
                address_id INTEGER,
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'PENDING',
                payment_method VARCHAR(20),
                payment_status VARCHAR(20) DEFAULT 'PENDING',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS order_items (
                order_item_id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
                product_id INTEGER,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS favorites (
                favorite_id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                product_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_id)
            )`,
            `CREATE TABLE IF NOT EXISTS reviews (
                review_id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
                consumer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                farmer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
                rating INTEGER NOT NULL,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const sql of tables) {
            try { await this.pool.query(sql); } catch (e) { console.error('Table error:', e.message); }
        }

        // Migrations: Add sack_size_kg column and update unique constraint if not exists
        const migrations = [
            // Add sack_size_kg column to cart_items if not exists
            `ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS sack_size_kg INTEGER DEFAULT NULL`,
            // Add sack_size_kg column to order_items if not exists
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sack_size_kg INTEGER DEFAULT NULL`,
            // Drop old unique constraint if exists
            `DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_user_id_product_id_key') THEN
                    ALTER TABLE cart_items DROP CONSTRAINT cart_items_user_id_product_id_key;
                END IF;
            END $$`,
            // Drop old constraint with sack_size_kg if exists (from previous migration)
            `DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_user_id_product_id_sack_size_kg_key') THEN
                    ALTER TABLE cart_items DROP CONSTRAINT cart_items_user_id_product_id_sack_size_kg_key;
                END IF;
            END $$`,
            // Drop old unique index if exists
            `DROP INDEX IF EXISTS cart_items_user_product_sack_unique`,
            // Create unique index that treats NULL as 0 (allowing multiple different products)
            `CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_sack_unique 
             ON cart_items (user_id, product_id, COALESCE(sack_size_kg, 0))`
        ];

        for (const sql of migrations) {
            try { await this.pool.query(sql); } catch (e) { console.error('Migration error:', e.message); }
        }

        console.log('✅ Consumer tables verified');
    }

    // Profile
    async getProfile(userId: number) {
        const res = await this.pool.query(
            `SELECT u.user_id, u.email, u.phone, p.full_name, p.address FROM users u LEFT JOIN profiles p ON u.user_id = p.user_id WHERE u.user_id = $1`,
            [userId]
        );
        return res.rows[0];
    }

    async updateProfile(userId: number, fullName: string) {
        const res = await this.pool.query(
            `INSERT INTO profiles (user_id, full_name) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW() RETURNING user_id, full_name`,
            [userId, fullName]
        );
        return res.rows[0];
    }

    // Addresses
    async getAddresses(userId: number) {
        const res = await this.pool.query(`SELECT * FROM consumer_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`, [userId]);
        return res.rows;
    }

    async addAddress(userId: number, data: any) {
        const { label, full_address, city, state, postal_code, is_default } = data;
        if (is_default) await this.pool.query(`UPDATE consumer_addresses SET is_default = FALSE WHERE user_id = $1`, [userId]);
        const res = await this.pool.query(
            `INSERT INTO consumer_addresses (user_id, label, full_address, city, state, postal_code, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [userId, label, full_address, city, state, postal_code, is_default || false]
        );
        return res.rows[0];
    }

    async updateAddress(userId: number, addressId: number, data: any) {
        const { label, full_address, city, state, postal_code, is_default } = data;
        if (is_default) await this.pool.query(`UPDATE consumer_addresses SET is_default = FALSE WHERE user_id = $1`, [userId]);
        const res = await this.pool.query(
            `UPDATE consumer_addresses SET label = $1, full_address = $2, city = $3, state = $4, postal_code = $5, is_default = $6 WHERE address_id = $7 AND user_id = $8 RETURNING *`,
            [label, full_address, city, state, postal_code, is_default || false, addressId, userId]
        );
        if (res.rowCount === 0) throw new NotFoundException('Address not found');
        return res.rows[0];
    }

    async deleteAddress(userId: number, addressId: number) {
        const res = await this.pool.query(`DELETE FROM consumer_addresses WHERE address_id = $1 AND user_id = $2`, [addressId, userId]);
        if (res.rowCount === 0) throw new NotFoundException('Address not found');
    }

    // Payment Methods
    async getPaymentMethods(userId: number) {
        const res = await this.pool.query(`SELECT * FROM payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`, [userId]);
        return res.rows;
    }

    async addPaymentMethod(userId: number, data: any) {
        const { payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default } = data;
        if (is_default) await this.pool.query(`UPDATE payment_methods SET is_default = FALSE WHERE user_id = $1`, [userId]);
        const res = await this.pool.query(
            `INSERT INTO payment_methods (user_id, payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [userId, payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default || false]
        );
        return res.rows[0];
    }

    async updatePaymentMethod(userId: number, paymentId: number, data: any) {
        const { payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default } = data;
        if (is_default) await this.pool.query(`UPDATE payment_methods SET is_default = FALSE WHERE user_id = $1`, [userId]);
        const res = await this.pool.query(
            `UPDATE payment_methods SET payment_type = $1, card_number_last4 = $2, card_holder_name = $3, expiry_month = $4, expiry_year = $5, upi_id = $6, wallet_provider = $7, is_default = $8 WHERE payment_id = $9 AND user_id = $10 RETURNING *`,
            [payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default || false, paymentId, userId]
        );
        if (res.rowCount === 0) throw new NotFoundException('Payment method not found');
        return res.rows[0];
    }

    async deletePaymentMethod(userId: number, paymentId: number) {
        const res = await this.pool.query(`DELETE FROM payment_methods WHERE payment_id = $1 AND user_id = $2`, [paymentId, userId]);
        if (res.rowCount === 0) throw new NotFoundException('Payment method not found');
    }

    // Cart
    async getCart(userId: number) {
        const res = await this.pool.query(
            `SELECT ci.*, ci.sack_size_kg, p.variety_name, p.rice_type, p.price_per_kg, p.quantity_unit as unit, 
             pr.farm_name, u.email as farmer_email,
             COALESCE((SELECT json_agg(pi.image_url ORDER BY pi.image_order) FROM product_images pi WHERE pi.product_id = p.product_id), '[]') as images,
             COALESCE((SELECT ps.price FROM product_sack_sizes ps WHERE ps.product_id = p.product_id AND ps.size_kg = ci.sack_size_kg), p.price_per_kg) as unit_price
             FROM cart_items ci 
             JOIN products p ON ci.product_id = p.product_id 
             LEFT JOIN users u ON p.farmer_id = u.user_id
             LEFT JOIN profiles pr ON p.farmer_id = pr.user_id
             WHERE ci.user_id = $1 ORDER BY ci.created_at DESC`,
            [userId]
        );
        // Calculate item_total for each item
        return res.rows.map(row => ({
            ...row,
            item_total: row.sack_size_kg 
                ? parseFloat(row.unit_price) * row.quantity  // sack purchase: price per sack × quantity
                : parseFloat(row.price_per_kg) * row.quantity // kg purchase: price per kg × quantity
        }));
    }

    async addToCart(userId: number, data: any) {
        const { product_id, quantity, sack_size_kg } = data;
        
        // Validate sack_size_kg if provided (must be null, 10, 25, or 50)
        const validSackSizes = [10, 25, 50];
        if (sack_size_kg !== null && sack_size_kg !== undefined && !validSackSizes.includes(sack_size_kg)) {
            throw new NotFoundException(`Invalid sack size. Valid options are: ${validSackSizes.join(', ')} kg`);
        }
        
        // Use upsert logic manually since we have a unique index with COALESCE
        const sackValue = sack_size_kg || null;
        
        // Check if item already exists
        const existing = await this.pool.query(
            `SELECT cart_item_id, quantity FROM cart_items 
             WHERE user_id = $1 AND product_id = $2 AND COALESCE(sack_size_kg, 0) = COALESCE($3, 0)`,
            [userId, product_id, sackValue]
        );
        
        if (existing.rows.length > 0) {
            // Update existing item
            const newQuantity = existing.rows[0].quantity + (quantity || 1);
            const res = await this.pool.query(
                `UPDATE cart_items SET quantity = $1, updated_at = NOW() 
                 WHERE cart_item_id = $2 RETURNING *`,
                [newQuantity, existing.rows[0].cart_item_id]
            );
            return res.rows[0];
        } else {
            // Insert new item
            const res = await this.pool.query(
                `INSERT INTO cart_items (user_id, product_id, quantity, sack_size_kg) 
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [userId, product_id, quantity || 1, sackValue]
            );
            return res.rows[0];
        }
    }

    async updateCartItem(userId: number, cartItemId: number, quantity: number) {
        const res = await this.pool.query(
            `UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE cart_item_id = $2 AND user_id = $3 RETURNING *`,
            [quantity, cartItemId, userId]
        );
        if (res.rowCount === 0) throw new NotFoundException('Cart item not found');
        return res.rows[0];
    }

    async removeCartItem(userId: number, cartItemId: number) {
        const res = await this.pool.query(`DELETE FROM cart_items WHERE cart_item_id = $1 AND user_id = $2`, [cartItemId, userId]);
        if (res.rowCount === 0) throw new NotFoundException('Cart item not found');
    }

    async clearCart(userId: number) {
        await this.pool.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
    }

    // Orders
    async getOrders(userId: number) {
        const res = await this.pool.query(
            `SELECT o.*, json_agg(json_build_object('product_id', oi.product_id, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'subtotal', oi.subtotal, 'name', p.variety_name)) as items
             FROM orders o LEFT JOIN order_items oi ON o.order_id = oi.order_id LEFT JOIN products p ON oi.product_id = p.product_id
             WHERE o.user_id = $1 GROUP BY o.order_id ORDER BY o.created_at DESC`,
            [userId]
        );
        return res.rows;
    }

    async createOrder(userId: number, data: any) {
        const { address_id, payment_method, items, notes } = data;
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            let totalAmount = 0, farmerId = null;
            
            // Calculate prices - handle both kg and sack purchases
            const itemsWithPrices: any[] = [];
            for (const item of items) {
                const productRes = await client.query(`SELECT price_per_kg, farmer_id FROM products WHERE product_id = $1`, [item.product_id]);
                if (productRes.rows.length === 0) throw new NotFoundException(`Product ${item.product_id} not found`);
                
                let unitPrice = parseFloat(productRes.rows[0].price_per_kg);
                
                // If sack_size_kg is specified, get the sack price
                if (item.sack_size_kg) {
                    const sackRes = await client.query(
                        `SELECT price FROM product_sack_sizes WHERE product_id = $1 AND size_kg = $2`,
                        [item.product_id, item.sack_size_kg]
                    );
                    if (sackRes.rows.length > 0) {
                        unitPrice = parseFloat(sackRes.rows[0].price);
                    }
                }
                
                const subtotal = unitPrice * item.quantity;
                totalAmount += subtotal;
                farmerId = productRes.rows[0].farmer_id;
                itemsWithPrices.push({ ...item, unitPrice, subtotal });
            }
            
            const orderRes = await client.query(
                `INSERT INTO orders (user_id, farmer_id, address_id, total_amount, payment_method, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [userId, farmerId, address_id, totalAmount, payment_method, notes]
            );
            const order = orderRes.rows[0];
            
            // Insert order items with correct prices
            for (const item of itemsWithPrices) {
                await client.query(
                    `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, sack_size_kg) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [order.order_id, item.product_id, item.quantity, item.unitPrice, item.subtotal, item.sack_size_kg || null]
                );
            }
            
            await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
            await client.query('COMMIT');
            return order;
        } catch (e) { await client.query('ROLLBACK'); throw e; }
        finally { client.release(); }
    }

    async getOrderDetails(userId: number, orderId: number) {
        const res = await this.pool.query(
            `SELECT o.*, ca.full_address, ca.city, ca.state, ca.postal_code,
             json_agg(json_build_object('product_id', oi.product_id, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'subtotal', oi.subtotal, 'name', p.variety_name)) as items
             FROM orders o LEFT JOIN consumer_addresses ca ON o.address_id = ca.address_id LEFT JOIN order_items oi ON o.order_id = oi.order_id LEFT JOIN products p ON oi.product_id = p.product_id
             WHERE o.order_id = $1 AND o.user_id = $2 GROUP BY o.order_id, ca.full_address, ca.city, ca.state, ca.postal_code`,
            [orderId, userId]
        );
        if (res.rowCount === 0) throw new NotFoundException('Order not found');
        return res.rows[0];
    }

    async cancelOrder(userId: number, orderId: number) {
        const res = await this.pool.query(
            `UPDATE orders SET status = 'CANCELLED', updated_at = NOW() WHERE order_id = $1 AND user_id = $2 AND status = 'PENDING' RETURNING *`,
            [orderId, userId]
        );
        if (res.rowCount === 0) throw new NotFoundException('Order not found or cannot be cancelled');
        return res.rows[0];
    }

    // Favorites
    async getFavorites(userId: number) {
        const res = await this.pool.query(
            `SELECT f.favorite_id, f.user_id, f.created_at as favorite_created_at,
             p.*, u.email as farmer_email, pr.full_name as farmer_name, pr.farm_name,
             COALESCE((SELECT json_agg(pi.image_url ORDER BY pi.image_order) FROM product_images pi WHERE pi.product_id = p.product_id), '[]') as images,
             (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.product_id) as average_rating,
             (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.product_id) as total_reviews
             FROM favorites f 
             JOIN products p ON f.product_id = p.product_id 
             LEFT JOIN users u ON p.farmer_id = u.user_id 
             LEFT JOIN profiles pr ON p.farmer_id = pr.user_id
             WHERE f.user_id = $1 
             ORDER BY f.created_at DESC`,
            [userId]
        );
        return res.rows.map(row => ({
            ...row,
            images: row.images || [],
            average_rating: row.average_rating ? parseFloat(row.average_rating) : 0,
            total_reviews: parseInt(row.total_reviews) || 0
        }));
    }

    async addFavorite(userId: number, productId: number) {
        await this.pool.query(`INSERT INTO favorites (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, productId]);
    }

    async removeFavorite(userId: number, productId: number) {
        await this.pool.query(`DELETE FROM favorites WHERE user_id = $1 AND product_id = $2`, [userId, productId]);
    }

    async checkFavorite(userId: number, productId: number) {
        const res = await this.pool.query(`SELECT 1 FROM favorites WHERE user_id = $1 AND product_id = $2`, [userId, productId]);
        return (res.rowCount ?? 0) > 0;
    }

    async toggleFavorite(userId: number, productId: number) {
        const isFavorite = await this.checkFavorite(userId, productId);
        if (isFavorite) { await this.removeFavorite(userId, productId); return { isFavorite: false }; }
        else { await this.addFavorite(userId, productId); return { isFavorite: true }; }
    }

    // Search & Homepage
    // Search & Homepage
    async searchProducts(query: any, userId: number) {
        const { q, rice_type, min_price, max_price, sort_by, limit = 20, offset = 0 } = query;
        let sql = `SELECT p.*, u.email as farmer_email, pr.full_name as farmer_name, pr.farm_name,
                   COALESCE((SELECT json_agg(pi.image_url ORDER BY pi.image_order) FROM product_images pi WHERE pi.product_id = p.product_id), '[]') as images,
                   EXISTS(SELECT 1 FROM favorites f WHERE f.product_id = p.product_id AND f.user_id = $1) as is_favorite
                   FROM products p 
                   LEFT JOIN users u ON p.farmer_id = u.user_id 
                   LEFT JOIN profiles pr ON p.farmer_id = pr.user_id
                   WHERE p.status = 'ACTIVE'`;
        const params: any[] = [userId];
        let idx = 2; // Start params from 2 since userId is 1

        if (q) { sql += ` AND (p.variety_name ILIKE $${idx} OR p.description ILIKE $${idx})`; params.push(`%${q}%`); idx++; }
        if (rice_type) { sql += ` AND p.rice_type = $${idx}`; params.push(rice_type); idx++; }
        if (min_price) { sql += ` AND p.price_per_kg >= $${idx}`; params.push(min_price); idx++; }
        if (max_price) { sql += ` AND p.price_per_kg <= $${idx}`; params.push(max_price); idx++; }

        if (sort_by === 'price_asc') sql += ` ORDER BY p.price_per_kg ASC`;
        else if (sort_by === 'price_desc') sql += ` ORDER BY p.price_per_kg DESC`;
        else sql += ` ORDER BY p.created_at DESC`;

        sql += ` LIMIT $${idx} OFFSET $${idx + 1}`; params.push(limit, offset);

        const res = await this.pool.query(sql, params);
        return res.rows.map(row => ({ ...row, images: row.images || [], is_favorite: row.is_favorite }));
    }

    async getProductDetails(productId: number, userId: number) {
        const res = await this.pool.query(
            `SELECT p.*, u.email as farmer_email, pr.full_name as farmer_name, pr.farm_name, pr.address as farmer_address,
             COALESCE((SELECT json_agg(pi.image_url ORDER BY pi.image_order) FROM product_images pi WHERE pi.product_id = p.product_id), '[]') as images,
             COALESCE((SELECT json_agg(json_build_object('sack_size_id', ps.sack_size_id, 'size_kg', ps.size_kg, 'price', ps.price) ORDER BY ps.size_kg) FROM product_sack_sizes ps WHERE ps.product_id = p.product_id), '[]') as sack_sizes,
             EXISTS(SELECT 1 FROM favorites f WHERE f.product_id = p.product_id AND f.user_id = $2) as is_favorite
             FROM products p 
             LEFT JOIN users u ON p.farmer_id = u.user_id 
             LEFT JOIN profiles pr ON p.farmer_id = pr.user_id
             WHERE p.product_id = $1`,
            [productId, userId]
        );
        if (res.rows.length === 0) throw new NotFoundException('Product not found');
        const product = res.rows[0];
        return { ...product, images: product.images || [], sack_sizes: product.sack_sizes || [], is_favorite: product.is_favorite };
    }

    async getHomepageData(userId: number) {
        // Fetch Featured Farmers (users with products or just role FARMER)
        // Assuming farmers are users with products for now, or just users with role 'FARMER' if I could check roles.
        // Since I don't have easy access to role check in this service without injecting another, I'll query based on having active products.
        const farmersRes = await this.pool.query(
            `SELECT DISTINCT ON (u.user_id) u.user_id as farmer_id, pr.full_name, pr.farm_name, pr.address,
             (SELECT AVG(r.rating) FROM reviews r WHERE r.farmer_id = u.user_id) as average_rating,
             (SELECT COUNT(*) FROM reviews r WHERE r.farmer_id = u.user_id) as total_reviews,
             (SELECT COUNT(*) FROM products p2 WHERE p2.farmer_id = u.user_id AND p2.status = 'ACTIVE') as product_count
             FROM users u
             JOIN products p ON u.user_id = p.farmer_id
             JOIN profiles pr ON u.user_id = pr.user_id
             WHERE p.status = 'ACTIVE'
             LIMIT 10`
        );

        // Fetch Popular Varieties (e.g. highest rated or just random selection for now)
        const popularRes = await this.pool.query(
            `SELECT p.*, u.email as farmer_email, pr.full_name as farmer_name, pr.farm_name,
             COALESCE((SELECT json_agg(pi.image_url ORDER BY pi.image_order) FROM product_images pi WHERE pi.product_id = p.product_id), '[]') as images,
             EXISTS(SELECT 1 FROM favorites f WHERE f.product_id = p.product_id AND f.user_id = $1) as is_favorite
             FROM products p 
             LEFT JOIN users u ON p.farmer_id = u.user_id 
             LEFT JOIN profiles pr ON p.farmer_id = pr.user_id
             WHERE p.status = 'ACTIVE' 
             ORDER BY (SELECT AVG(rating) FROM reviews r WHERE r.product_id = p.product_id) DESC NULLS LAST
             LIMIT 10`,
            [userId]
        );
        const popular_varieties = popularRes.rows.map(row => ({ ...row, images: row.images || [], is_favorite: row.is_favorite }));

        // Fetch New Arrivals
        const newArrivalsRes = await this.pool.query(
            `SELECT p.*, u.email as farmer_email, pr.full_name as farmer_name, pr.farm_name,
             COALESCE((SELECT json_agg(pi.image_url ORDER BY pi.image_order) FROM product_images pi WHERE pi.product_id = p.product_id), '[]') as images,
             EXISTS(SELECT 1 FROM favorites f WHERE f.product_id = p.product_id AND f.user_id = $1) as is_favorite
             FROM products p 
             LEFT JOIN users u ON p.farmer_id = u.user_id 
             LEFT JOIN profiles pr ON p.farmer_id = pr.user_id
             WHERE p.status = 'ACTIVE' ORDER BY p.created_at DESC LIMIT 10`,
            [userId]
        );
        const new_arrivals = newArrivalsRes.rows.map(row => ({ ...row, images: row.images || [], is_favorite: row.is_favorite }));

        return {
            featured_farmers: farmersRes.rows,
            popular_varieties: popular_varieties,
            new_arrivals: new_arrivals
        };
    }

    // Farmer Storefront
    async getFarmerStorefront(farmerId: number, userId: number) {
        // Get farmer profile
        const farmerRes = await this.pool.query(
            `SELECT u.user_id as farmer_id, u.email, pr.full_name, pr.farm_name, pr.address,
             (SELECT AVG(r.rating) FROM reviews r WHERE r.farmer_id = u.user_id) as average_rating,
             (SELECT COUNT(*) FROM reviews r WHERE r.farmer_id = u.user_id) as total_reviews
             FROM users u
             LEFT JOIN profiles pr ON u.user_id = pr.user_id
             WHERE u.user_id = $1 AND u.role = 'FARMER'`,
            [farmerId]
        );

        if (farmerRes.rows.length === 0) {
            throw new NotFoundException('Farmer not found');
        }

        const farmer = farmerRes.rows[0];

        // Get farmer's active products
        const productsRes = await this.pool.query(
            `SELECT p.*, 
             COALESCE((SELECT json_agg(pi.image_url ORDER BY pi.image_order) FROM product_images pi WHERE pi.product_id = p.product_id), '[]') as images,
             EXISTS(SELECT 1 FROM favorites f WHERE f.product_id = p.product_id AND f.user_id = $2) as is_favorite
             FROM products p
             WHERE p.farmer_id = $1 AND p.status = 'ACTIVE'
             ORDER BY p.created_at DESC`,
            [farmerId, userId]
        );

        const products = productsRes.rows.map(row => ({
            ...row,
            images: row.images || [],
            is_favorite: row.is_favorite
        }));

        return {
            farmer: {
                ...farmer,
                average_rating: farmer.average_rating ? parseFloat(farmer.average_rating) : null,
                total_reviews: parseInt(farmer.total_reviews) || 0
            },
            products: products,
            product_count: products.length
        };
    }

    // ===================== Reviews =====================
    async createReview(userId: number, orderId: number, rating: number, comment: string, productId?: number) {
        // Get the farmer_id from the order
        const orderRes = await this.pool.query(`
            SELECT farmer_id FROM orders WHERE order_id = $1 AND user_id = $2 AND status = 'DELIVERED'
        `, [orderId, userId]);

        if (orderRes.rows.length === 0) {
            throw new Error('Order not found or not eligible for review');
        }

        const farmerId = orderRes.rows[0].farmer_id;

        const res = await this.pool.query(`
            INSERT INTO reviews (order_id, consumer_id, farmer_id, product_id, rating, comment)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (order_id, consumer_id) DO UPDATE SET 
                rating = EXCLUDED.rating, 
                comment = EXCLUDED.comment,
                updated_at = NOW()
            RETURNING *
        `, [orderId, userId, farmerId, productId || null, rating, comment || null]);

        return res.rows[0];
    }

    async checkOrderReview(userId: number, orderId: number) {
        const res = await this.pool.query(`
            SELECT * FROM reviews WHERE order_id = $1 AND consumer_id = $2
        `, [orderId, userId]);
        return res.rows[0] || null;
    }

    async getFarmerReviews(farmerId: number, limit = 20, offset = 0) {
        const res = await this.pool.query(`
            SELECT r.*, p.full_name as consumer_name, pr.variety_name as product_name
            FROM reviews r
            LEFT JOIN profiles p ON r.consumer_id = p.user_id
            LEFT JOIN products pr ON r.product_id = pr.product_id
            WHERE r.farmer_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
        `, [farmerId, limit, offset]);
        return res.rows;
    }

    async getFarmerRating(farmerId: number) {
        const res = await this.pool.query(`
            SELECT 
                AVG(rating) as average_rating,
                COUNT(*) as total_reviews,
                COUNT(*) FILTER (WHERE rating = 5) as five_star,
                COUNT(*) FILTER (WHERE rating = 4) as four_star,
                COUNT(*) FILTER (WHERE rating = 3) as three_star,
                COUNT(*) FILTER (WHERE rating = 2) as two_star,
                COUNT(*) FILTER (WHERE rating = 1) as one_star
            FROM reviews WHERE farmer_id = $1
        `, [farmerId]);
        return res.rows[0];
    }

    async getProductReviews(productId: number, limit = 20, offset = 0) {
        const res = await this.pool.query(`
            SELECT r.*, p.full_name as consumer_name
            FROM reviews r
            LEFT JOIN profiles p ON r.consumer_id = p.user_id
            WHERE r.product_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
        `, [productId, limit, offset]);
        return res.rows;
    }

    // ===================== Notifications =====================
    async getNotifications(userId: number, limit = 50) {
        const res = await this.pool.query(`
            SELECT * FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [userId, limit]);
        return res.rows;
    }

    async markNotificationAsRead(userId: number, notificationId: number) {
        const res = await this.pool.query(`
            UPDATE notifications SET is_read = true WHERE notification_id = $1 AND user_id = $2
            RETURNING *
        `, [notificationId, userId]);
        return res.rows[0] || null;
    }

    async markAllNotificationsAsRead(userId: number) {
        await this.pool.query(`
            UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false
        `, [userId]);
        return { success: true };
    }

    async getUnreadCount(userId: number) {
        const res = await this.pool.query(`
            SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false
        `, [userId]);
        return parseInt(res.rows[0]?.unread_count || 0);
    }

    // ===================== Promo Codes =====================
    async validatePromoCode(code: string, orderAmount: number) {
        const res = await this.pool.query(`
            SELECT * FROM promo_codes
            WHERE code = $1 AND is_active = true
            AND (valid_from IS NULL OR valid_from <= NOW())
            AND (valid_until IS NULL OR valid_until >= NOW())
            AND (usage_limit IS NULL OR used_count < usage_limit)
        `, [code.toUpperCase()]);

        if (res.rows.length === 0) {
            return { valid: false, message: 'Invalid or expired promo code' };
        }

        const promo = res.rows[0];

        if (orderAmount < parseFloat(promo.min_order_amount || 0)) {
            return { valid: false, message: `Minimum order amount is ${promo.min_order_amount}` };
        }

        let discount = 0;
        if (promo.discount_type === 'PERCENTAGE') {
            discount = orderAmount * (parseFloat(promo.discount_value) / 100);
            if (promo.max_discount_amount && discount > parseFloat(promo.max_discount_amount)) {
                discount = parseFloat(promo.max_discount_amount);
            }
        } else {
            discount = parseFloat(promo.discount_value);
        }

        return {
            valid: true,
            promo_id: promo.promo_id,
            code: promo.code,
            discount_type: promo.discount_type,
            discount_value: promo.discount_value,
            discount_amount: discount,
            final_amount: orderAmount - discount
        };
    }

    // ===================== COD Eligibility =====================
    async checkCODEligibility(userId: number, orderAmount: number, farmerId?: number) {
        // Check user's COD eligibility
        const userEligibility = await this.pool.query(`
            SELECT * FROM cod_eligibility WHERE user_id = $1
        `, [userId]);

        if (userEligibility.rows.length > 0) {
            const eligibility = userEligibility.rows[0];
            if (!eligibility.is_eligible) {
                return { eligible: false, reason: eligibility.reason || 'COD not available for your account' };
            }
            if (eligibility.max_order_value && orderAmount > parseFloat(eligibility.max_order_value)) {
                return { eligible: false, reason: `Order amount exceeds COD limit of ${eligibility.max_order_value}` };
            }
        }

        // Check farmer's COD settings if provided
        if (farmerId) {
            const farmerSettings = await this.pool.query(`
                SELECT * FROM cod_settings WHERE farmer_id = $1
            `, [farmerId]);

            if (farmerSettings.rows.length > 0) {
                const settings = farmerSettings.rows[0];
                if (!settings.is_enabled) {
                    return { eligible: false, reason: 'Farmer does not accept COD' };
                }
                if (settings.min_order_amount && orderAmount < parseFloat(settings.min_order_amount)) {
                    return { eligible: false, reason: `Minimum order for COD is ${settings.min_order_amount}` };
                }
                if (settings.max_order_amount && orderAmount > parseFloat(settings.max_order_amount)) {
                    return { eligible: false, reason: `Maximum order for COD is ${settings.max_order_amount}` };
                }
            }
        }

        return { eligible: true };
    }
}

