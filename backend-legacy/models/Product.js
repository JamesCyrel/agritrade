const pool = require('../config/database');

class Product {
  // Create products table
  static async createTable() {
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

      -- Update status constraint if needed (handles existing tables)
      -- This must be done BEFORE migrating data to avoid constraint violations
      DO $$ 
      BEGIN
        -- Drop old constraint if exists (might allow DELETED or not allow ARCHIVED)
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'products_status_check' 
          AND conrelid = 'products'::regclass
        ) THEN
          ALTER TABLE products DROP CONSTRAINT products_status_check;
        END IF;
        -- Add new constraint that allows ARCHIVED
        ALTER TABLE products ADD CONSTRAINT products_status_check 
          CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED'));
      END $$;

      -- Migrate existing DELETED status to ARCHIVED (after constraint is updated)
      DO $$ 
      BEGIN
        UPDATE products SET status = 'ARCHIVED' WHERE status = 'DELETED';
      END $$;
    `;

    try {
      await pool.query(query);
      console.log('✅ Products tables created/verified');
    } catch (error) {
      console.error('❌ Error creating products tables:', error);
      throw error;
    }
  }

  // Create a new product
  static async create(farmerId, productData) {
    const { rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, images, sack_sizes } = productData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert product
      const productResult = await client.query(`
        INSERT INTO products (farmer_id, rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING product_id, farmer_id, rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, status, created_at
      `, [farmerId, rice_type, variety_name, description || null, price_per_kg, available_quantity, quantity_unit || 'KG']);

      const product = productResult.rows[0];

      // Insert images if provided
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          await client.query(`
            INSERT INTO product_images (product_id, image_url, image_order)
            VALUES ($1, $2, $3)
          `, [product.product_id, images[i], i]);
        }
      }

      // Insert sack sizes if provided
      if (sack_sizes && sack_sizes.length > 0) {
        for (const sack of sack_sizes) {
          await client.query(`
            INSERT INTO product_sack_sizes (product_id, size_kg, price)
            VALUES ($1, $2, $3)
          `, [product.product_id, sack.size_kg, sack.price]);
        }
      }

      await client.query('COMMIT');

      // Fetch complete product with images and sack sizes
      return await this.findById(product.product_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get product by ID with all related data
  static async findById(productId) {
    const productResult = await pool.query(`
      SELECT * FROM products WHERE product_id = $1
    `, [productId]);

    if (productResult.rows.length === 0) return null;

    const product = productResult.rows[0];

    // Get images
    const imagesResult = await pool.query(`
      SELECT image_url, image_order FROM product_images
      WHERE product_id = $1
      ORDER BY image_order ASC
    `, [productId]);
    product.images = imagesResult.rows.map(r => r.image_url);

    // Get sack sizes
    const sacksResult = await pool.query(`
      SELECT size_kg, price FROM product_sack_sizes
      WHERE product_id = $1
      ORDER BY size_kg ASC
    `, [productId]);
    product.sack_sizes = sacksResult.rows;

    return product;
  }

  // Get all products for a farmer
  static async findByFarmerId(farmerId, includeInactive = false) {
    let query = `
      SELECT p.*, 
        (SELECT array_agg(image_url ORDER BY image_order) 
         FROM product_images 
         WHERE product_id = p.product_id) as images,
        (SELECT json_agg(json_build_object('size_kg', size_kg, 'price', price) ORDER BY size_kg)
         FROM product_sack_sizes 
         WHERE product_id = p.product_id) as sack_sizes
      FROM products p
      WHERE p.farmer_id = $1
    `;

    if (!includeInactive) {
      query += ` AND p.status != 'ARCHIVED'`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, [farmerId]);
    return result.rows;
  }

  // Update product
  static async update(productId, farmerId, productData) {
    const { rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, status, images, sack_sizes } = productData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update product
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (rice_type !== undefined) {
        updateFields.push(`rice_type = $${paramCount++}`);
        updateValues.push(rice_type);
      }
      if (variety_name !== undefined) {
        updateFields.push(`variety_name = $${paramCount++}`);
        updateValues.push(variety_name);
      }
      if (description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        updateValues.push(description);
      }
      if (price_per_kg !== undefined) {
        updateFields.push(`price_per_kg = $${paramCount++}`);
        updateValues.push(price_per_kg);
      }
      if (available_quantity !== undefined) {
        updateFields.push(`available_quantity = $${paramCount++}`);
        updateValues.push(available_quantity);
      }
      if (quantity_unit !== undefined) {
        updateFields.push(`quantity_unit = $${paramCount++}`);
        updateValues.push(quantity_unit);
      }
      if (status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        updateValues.push(status);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      if (updateFields.length > 1) {
        updateValues.push(productId, farmerId);
        await client.query(`
          UPDATE products
          SET ${updateFields.join(', ')}
          WHERE product_id = $${paramCount++} AND farmer_id = $${paramCount++}
        `, updateValues);
      }

      // Update images if provided
      if (images !== undefined) {
        // Delete existing images
        await client.query(`DELETE FROM product_images WHERE product_id = $1`, [productId]);
        
        // Insert new images
        if (images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            await client.query(`
              INSERT INTO product_images (product_id, image_url, image_order)
              VALUES ($1, $2, $3)
            `, [productId, images[i], i]);
          }
        }
      }

      // Update sack sizes if provided
      if (sack_sizes !== undefined) {
        // Delete existing sack sizes
        await client.query(`DELETE FROM product_sack_sizes WHERE product_id = $1`, [productId]);
        
        // Insert new sack sizes
        if (sack_sizes.length > 0) {
          for (const sack of sack_sizes) {
            await client.query(`
              INSERT INTO product_sack_sizes (product_id, size_kg, price)
              VALUES ($1, $2, $3)
            `, [productId, sack.size_kg, sack.price]);
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

  // Archive product (soft delete by setting status to ARCHIVED)
  static async archive(productId, farmerId) {
    const result = await pool.query(`
      UPDATE products
      SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $1 AND farmer_id = $2
      RETURNING product_id
    `, [productId, farmerId]);
    return result.rows[0];
  }

  // Unarchive product (restore from ARCHIVED to INACTIVE)
  static async unarchive(productId, farmerId) {
    const result = await pool.query(`
      UPDATE products
      SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $1 AND farmer_id = $2 AND status = 'ARCHIVED'
      RETURNING product_id
    `, [productId, farmerId]);
    return result.rows[0];
  }

  // Get archived products for a farmer
  static async findArchivedByFarmerId(farmerId) {
    const query = `
      SELECT p.*, 
        (SELECT array_agg(image_url ORDER BY image_order) 
         FROM product_images 
         WHERE product_id = p.product_id) as images,
        (SELECT json_agg(json_build_object('size_kg', size_kg, 'price', price) ORDER BY size_kg)
         FROM product_sack_sizes 
         WHERE product_id = p.product_id) as sack_sizes
      FROM products p
      WHERE p.farmer_id = $1 AND p.status = 'ARCHIVED'
      ORDER BY p.updated_at DESC
    `;
    const result = await pool.query(query, [farmerId]);
    return result.rows;
  }

  // Update inventory (quantity)
  static async updateInventory(productId, farmerId, quantity) {
    const result = await pool.query(`
      UPDATE products
      SET available_quantity = $1, updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $2 AND farmer_id = $3
      RETURNING product_id, available_quantity
    `, [quantity, productId, farmerId]);
    return result.rows[0];
  }

  // Decrement inventory (for order confirmation)
  static async decrementInventory(productId, quantity) {
    const result = await pool.query(`
      UPDATE products
      SET available_quantity = GREATEST(0, available_quantity - $1), updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $2
      RETURNING product_id, available_quantity
    `, [quantity, productId]);
    return result.rows[0];
  }

  // Increment inventory (for order cancellation)
  static async incrementInventory(productId, quantity) {
    const result = await pool.query(`
      UPDATE products
      SET available_quantity = available_quantity + $1, updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $2
      RETURNING product_id, available_quantity
    `, [quantity, productId]);
    return result.rows[0];
  }

  // Check if farmer is verified
  static async isFarmerVerified(farmerId) {
    const result = await pool.query(`
      SELECT verification_status FROM profiles
      WHERE user_id = $1
    `, [farmerId]);
    return result.rows[0]?.verification_status === 'APPROVED';
  }

  // ===== CONSUMER BROWSING METHODS =====

  // Get homepage data: Featured Farmers, Popular Rice Varieties, New Arrivals
  static async getHomepageData() {
    const query = `
      WITH farmer_stats AS (
        SELECT 
          p.farmer_id,
          COUNT(DISTINCT p.product_id) as product_count,
          AVG(p.price_per_kg) as avg_price,
          pr.farm_name,
          pr.full_name,
          pr.address,
          pr.latitude,
          pr.longitude,
          pr.verification_status,
          -- Placeholder for ratings (will be implemented in RR-2)
          0 as average_rating,
          0 as total_reviews
        FROM products p
        INNER JOIN profiles pr ON p.farmer_id = pr.user_id
        WHERE p.status = 'ACTIVE'
          AND pr.verification_status = 'APPROVED'
        GROUP BY p.farmer_id, pr.farm_name, pr.full_name, pr.address, pr.latitude, pr.longitude, pr.verification_status
      ),
      featured_farmers AS (
        SELECT 
          fs.farmer_id,
          fs.farm_name,
          fs.full_name,
          fs.address,
          fs.latitude,
          fs.longitude,
          fs.average_rating,
          fs.total_reviews,
          fs.product_count
        FROM farmer_stats fs
        ORDER BY fs.product_count DESC, fs.average_rating DESC
        LIMIT 5
      ),
      popular_varieties AS (
        SELECT 
          p.product_id,
          p.rice_type,
          p.variety_name,
          p.price_per_kg,
          p.description,
          p.available_quantity,
          p.quantity_unit,
          p.created_at,
          pr.farm_name,
          p.farmer_id,
          -- Placeholder for ratings
          0 as average_rating,
          0 as total_reviews,
          (SELECT array_agg(image_url ORDER BY image_order) 
           FROM product_images 
           WHERE product_id = p.product_id) as images
        FROM products p
        INNER JOIN profiles pr ON p.farmer_id = pr.user_id
        WHERE p.status = 'ACTIVE'
          AND pr.verification_status = 'APPROVED'
          AND p.available_quantity > 0
        ORDER BY p.available_quantity DESC, p.created_at DESC
        LIMIT 10
      ),
      new_arrivals AS (
        SELECT 
          p.product_id,
          p.rice_type,
          p.variety_name,
          p.price_per_kg,
          p.description,
          p.available_quantity,
          p.quantity_unit,
          p.created_at,
          pr.farm_name,
          p.farmer_id,
          -- Placeholder for ratings
          0 as average_rating,
          0 as total_reviews,
          (SELECT array_agg(image_url ORDER BY image_order) 
           FROM product_images 
           WHERE product_id = p.product_id) as images
        FROM products p
        INNER JOIN profiles pr ON p.farmer_id = pr.user_id
        WHERE p.status = 'ACTIVE'
          AND pr.verification_status = 'APPROVED'
          AND p.available_quantity > 0
        ORDER BY p.created_at DESC
        LIMIT 10
      )
      SELECT 
        (SELECT json_agg(row_to_json(f)) FROM featured_farmers f) as featured_farmers,
        (SELECT json_agg(row_to_json(v)) FROM popular_varieties v) as popular_varieties,
        (SELECT json_agg(row_to_json(n)) FROM new_arrivals n) as new_arrivals;
    `;
    const result = await pool.query(query);
    return result.rows[0] || { featured_farmers: [], popular_varieties: [], new_arrivals: [] };
  }

  // Search products with filters and sorting (SB-2, SB-3)
  static async searchProducts(searchParams) {
    const {
      searchQuery = '',
      riceType = null,
      minPrice = null,
      maxPrice = null,
      maxDistance = null,
      consumerLat = null,
      consumerLng = null,
      minRating = null,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      limit = 20,
      offset = 0
    } = searchParams;

    let query = `
      SELECT 
        p.product_id,
        p.rice_type,
        p.variety_name,
        p.description,
        p.price_per_kg,
        p.available_quantity,
        p.quantity_unit,
        p.created_at,
        p.farmer_id,
        pr.farm_name,
        pr.full_name as farmer_name,
        pr.address as farmer_address,
        pr.latitude as farmer_latitude,
        pr.longitude as farmer_longitude,
        -- Placeholder for ratings
        0 as average_rating,
        0 as total_reviews,
        (SELECT array_agg(image_url ORDER BY image_order) 
         FROM product_images 
         WHERE product_id = p.product_id) as images,
        (SELECT json_agg(json_build_object('size_kg', size_kg, 'price', price) ORDER BY size_kg)
         FROM product_sack_sizes 
         WHERE product_id = p.product_id) as sack_sizes,
        NULL as distance_km
    `;

    query += `
      FROM products p
      INNER JOIN profiles pr ON p.farmer_id = pr.user_id
      WHERE p.status = 'ACTIVE'
        AND pr.verification_status = 'APPROVED'
        AND p.available_quantity > 0
    `;

    const conditions = [];
    const params = [];
    let paramCount = 1;

    // Search query (variety name or farmer name)
    if (searchQuery.trim()) {
      conditions.push(`(
        p.variety_name ILIKE $${paramCount} OR 
        pr.farm_name ILIKE $${paramCount} OR
        pr.full_name ILIKE $${paramCount}
      )`);
      params.push(`%${searchQuery.trim()}%`);
      paramCount++;
    }

    // Rice type filter
    if (riceType && ['MILLED', 'UNMILLED_PADDY'].includes(riceType)) {
      conditions.push(`p.rice_type = $${paramCount}`);
      params.push(riceType);
      paramCount++;
    }

    // Price range filter
    if (minPrice !== null) {
      conditions.push(`p.price_per_kg >= $${paramCount}`);
      params.push(parseFloat(minPrice));
      paramCount++;
    }
    if (maxPrice !== null) {
      conditions.push(`p.price_per_kg <= $${paramCount}`);
      params.push(parseFloat(maxPrice));
      paramCount++;
    }

    // Rating filter (placeholder - will use actual ratings table later)
    if (minRating !== null) {
      // For now, we'll skip rating filter as ratings aren't implemented yet
      // This will be updated when RR-2 is implemented
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    // Distance filter (after selecting, so we need a subquery or CTE)
    if (maxDistance !== null && consumerLat && consumerLng) {
      const baseQuery = query;
      query = `
        WITH filtered_products AS (
          ${baseQuery}
        )
        SELECT *, 
          (
            6371 * acos(
              cos(radians(${consumerLat})) * 
              cos(radians(farmer_latitude::numeric)) * 
              cos(radians(farmer_longitude::numeric) - radians(${consumerLng})) + 
              sin(radians(${consumerLat})) * 
              sin(radians(farmer_latitude::numeric))
            )
          ) as distance_km
        FROM filtered_products
        WHERE (
          6371 * acos(
            cos(radians(${consumerLat})) * 
            cos(radians(farmer_latitude::numeric)) * 
            cos(radians(farmer_longitude::numeric) - radians(${consumerLng})) + 
            sin(radians(${consumerLat})) * 
            sin(radians(farmer_latitude::numeric))
          )
        ) <= $${paramCount}
      `;
      params.push(parseFloat(maxDistance));
      paramCount++;
    } else if (consumerLat && consumerLng) {
      // Calculate distance even if not filtering by it
      const baseQuery = query;
      query = `
        SELECT *, 
          (
            6371 * acos(
              cos(radians(${consumerLat})) * 
              cos(radians(farmer_latitude::numeric)) * 
              cos(radians(farmer_longitude::numeric) - radians(${consumerLng})) + 
              sin(radians(${consumerLat})) * 
              sin(radians(farmer_latitude::numeric))
            )
          ) as distance_km
        FROM (${baseQuery}) as base_query
      `;
    }

    // Sorting
    const validSortFields = {
      'price_low': 'p.price_per_kg ASC',
      'price_high': 'p.price_per_kg DESC',
      'rating': 'average_rating DESC', // Placeholder
      'distance': 'distance_km ASC',
      'newest': 'p.created_at DESC',
      'oldest': 'p.created_at ASC'
    };

    const sortClause = validSortFields[sortBy] || 'p.created_at DESC';
    query += ` ORDER BY ${sortClause}`;

    // Pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get product details with farmer info (SB-4)
  static async getProductDetailsForConsumer(productId) {
    const query = `
      SELECT 
        p.product_id,
        p.rice_type,
        p.variety_name,
        p.description,
        p.price_per_kg,
        p.available_quantity,
        p.quantity_unit,
        p.created_at,
        p.updated_at,
        p.farmer_id,
        pr.farm_name,
        pr.full_name as farmer_name,
        pr.address as farmer_address,
        pr.latitude as farmer_latitude,
        pr.longitude as farmer_longitude,
        -- Placeholder for ratings
        0 as average_rating,
        0 as total_reviews,
        (SELECT array_agg(image_url ORDER BY image_order) 
         FROM product_images 
         WHERE product_id = p.product_id) as images,
        (SELECT json_agg(json_build_object('size_kg', size_kg, 'price', price) ORDER BY size_kg)
         FROM product_sack_sizes 
         WHERE product_id = p.product_id) as sack_sizes
      FROM products p
      INNER JOIN profiles pr ON p.farmer_id = pr.user_id
      WHERE p.product_id = $1
        AND p.status = 'ACTIVE'
        AND pr.verification_status = 'APPROVED'
    `;
    const result = await pool.query(query, [productId]);
    return result.rows[0] || null;
  }

  // Get farmer storefront (SB-5)
  static async getFarmerStorefront(farmerId) {
    // Get farmer profile
    const profileQuery = `
      SELECT 
        pr.user_id as farmer_id,
        pr.farm_name,
        pr.full_name,
        pr.address,
        pr.latitude,
        pr.longitude,
        pr.verification_status,
        (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE farmer_id = pr.user_id) as average_rating,
        (SELECT COUNT(*) FROM reviews WHERE farmer_id = pr.user_id) as total_reviews
      FROM profiles pr
      WHERE pr.user_id = $1
        AND pr.verification_status = 'APPROVED'
    `;
    const profileResult = await pool.query(profileQuery, [farmerId]);
    if (profileResult.rows.length === 0) {
      return null;
    }

    const farmerProfile = profileResult.rows[0];

    // Get all active products
    const productsQuery = `
      SELECT 
        p.product_id,
        p.rice_type,
        p.variety_name,
        p.description,
        p.price_per_kg,
        p.available_quantity,
        p.quantity_unit,
        p.created_at,
        -- Placeholder for ratings
        0 as average_rating,
        0 as total_reviews,
        (SELECT array_agg(image_url ORDER BY image_order) 
         FROM product_images 
         WHERE product_id = p.product_id) as images,
        (SELECT json_agg(json_build_object('size_kg', size_kg, 'price', price) ORDER BY size_kg)
         FROM product_sack_sizes 
         WHERE product_id = p.product_id) as sack_sizes
      FROM products p
      WHERE p.farmer_id = $1
        AND p.status = 'ACTIVE'
        AND p.available_quantity > 0
      ORDER BY p.created_at DESC
    `;
    const productsResult = await pool.query(productsQuery, [farmerId]);

    return {
      farmer: farmerProfile,
      products: productsResult.rows
    };
  }
}

module.exports = Product;

