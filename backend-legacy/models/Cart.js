const pool = require('../config/database');

class Cart {
  // Create cart table
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS cart_items (
        cart_item_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        quantity DECIMAL(10, 2) NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        sack_size_kg DECIMAL(10, 2), -- NULL if buying by kg, otherwise the sack size
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id, sack_size_kg)
      );

      CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
    `;

    try {
      await pool.query(query);
      console.log('✅ Cart tables created/verified');
    } catch (error) {
      console.error('❌ Error creating cart tables:', error);
      throw error;
    }
  }

  // Add item to cart (OC-1)
  static async addItem(userId, productId, quantity, unitPrice, sackSizeKg = null) {
    // Check if item already exists in cart
    const existingQuery = `
      SELECT cart_item_id, quantity 
      FROM cart_items 
      WHERE user_id = $1 AND product_id = $2 AND (sack_size_kg = $3 OR (sack_size_kg IS NULL AND $3 IS NULL))
    `;
    const existingResult = await pool.query(existingQuery, [userId, productId, sackSizeKg]);

    if (existingResult.rows.length > 0) {
      // Update quantity
      const newQuantity = parseFloat(existingResult.rows[0].quantity) + parseFloat(quantity);
      const updateResult = await pool.query(
        `UPDATE cart_items 
         SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE cart_item_id = $2 
         RETURNING *`,
        [newQuantity, existingResult.rows[0].cart_item_id]
      );
      return updateResult.rows[0];
    } else {
      // Insert new item
      const insertResult = await pool.query(
        `INSERT INTO cart_items (user_id, product_id, quantity, unit_price, sack_size_kg)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, productId, parseFloat(quantity), parseFloat(unitPrice), sackSizeKg]
      );
      return insertResult.rows[0];
    }
  }

  // Get all cart items for a user (OC-2)
  static async getCartItems(userId) {
    const query = `
      SELECT 
        ci.cart_item_id,
        ci.quantity,
        ci.unit_price,
        ci.sack_size_kg,
        ci.created_at,
        ci.updated_at,
        p.product_id,
        p.rice_type,
        p.variety_name,
        p.description,
        p.price_per_kg,
        p.available_quantity,
        p.quantity_unit,
        p.farmer_id,
        pr.farm_name,
        pr.full_name as farmer_name,
        (SELECT array_agg(image_url ORDER BY image_order) 
         FROM product_images 
         WHERE product_id = p.product_id) as images,
        (SELECT json_agg(json_build_object('size_kg', size_kg, 'price', price) ORDER BY size_kg)
         FROM product_sack_sizes 
         WHERE product_id = p.product_id) as sack_sizes
      FROM cart_items ci
      INNER JOIN products p ON ci.product_id = p.product_id
      INNER JOIN profiles pr ON p.farmer_id = pr.user_id
      WHERE ci.user_id = $1
      ORDER BY ci.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Update cart item quantity (OC-2)
  static async updateQuantity(cartItemId, userId, quantity) {
    const result = await pool.query(
      `UPDATE cart_items 
       SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE cart_item_id = $2 AND user_id = $3
       RETURNING *`,
      [parseFloat(quantity), cartItemId, userId]
    );
    return result.rows[0];
  }

  // Remove item from cart (OC-2)
  static async removeItem(cartItemId, userId) {
    const result = await pool.query(
      `DELETE FROM cart_items 
       WHERE cart_item_id = $1 AND user_id = $2
       RETURNING cart_item_id`,
      [cartItemId, userId]
    );
    return result.rows[0];
  }

  // Clear entire cart (OC-2)
  static async clearCart(userId) {
    await pool.query(
      `DELETE FROM cart_items WHERE user_id = $1`,
      [userId]
    );
  }

  // Get cart item by ID
  static async getCartItemById(cartItemId, userId) {
    const result = await pool.query(
      `SELECT * FROM cart_items 
       WHERE cart_item_id = $1 AND user_id = $2`,
      [cartItemId, userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = Cart;

