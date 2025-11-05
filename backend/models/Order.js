const pool = require('../config/database');

class Order {
  // Create orders table
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS orders (
        order_id SERIAL PRIMARY KEY,
        consumer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
        delivery_address_id INTEGER REFERENCES consumer_addresses(address_id) ON DELETE SET NULL,
        payment_method_id INTEGER REFERENCES consumer_payment_methods(payment_id) ON DELETE SET NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        delivery_fee DECIMAL(10, 2) DEFAULT 0,
        tax DECIMAL(10, 2) DEFAULT 0,
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        promo_code VARCHAR(50),
        total_amount DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        order_item_id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        quantity DECIMAL(10, 2) NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        sack_size_kg DECIMAL(10, 2),
        subtotal DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS promo_codes (
        promo_id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
        discount_value DECIMAL(10, 2) NOT NULL,
        min_order_amount DECIMAL(10, 2) DEFAULT 0,
        max_discount_amount DECIMAL(10, 2),
        usage_limit INTEGER,
        used_count INTEGER DEFAULT 0,
        valid_from TIMESTAMP,
        valid_until TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_orders_consumer_id ON orders(consumer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_farmer_id ON orders(farmer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
    `;

    try {
      await pool.query(query);
      console.log('✅ Order tables created/verified');
    } catch (error) {
      console.error('❌ Error creating order tables:', error);
      throw error;
    }
  }

  // Generate unique order number
  static generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
  }

  // Create order from cart (OC-3)
  static async createOrder(orderData) {
    const {
      consumerId,
      farmerId,
      deliveryAddressId,
      paymentMethodId,
      subtotal,
      deliveryFee = 0,
      tax = 0,
      discountAmount = 0,
      promoCode = null,
      totalAmount,
      notes = null,
      items
    } = orderData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderNumber = this.generateOrderNumber();

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (
          consumer_id, farmer_id, order_number, delivery_address_id, payment_method_id,
          subtotal, delivery_fee, tax, discount_amount, promo_code, total_amount, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          consumerId, farmerId, orderNumber, deliveryAddressId, paymentMethodId,
          parseFloat(subtotal), parseFloat(deliveryFee), parseFloat(tax),
          parseFloat(discountAmount), promoCode, parseFloat(totalAmount), notes
        ]
      );
      const order = orderResult.rows[0];

      // Create order items
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, sack_size_kg, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            order.order_id,
            item.product_id,
            parseFloat(item.quantity),
            parseFloat(item.unit_price),
            item.sack_size_kg || null,
            parseFloat(item.subtotal)
          ]
        );
      }

      // Update promo code usage if applicable
      if (promoCode) {
        await client.query(
          `UPDATE promo_codes 
           SET used_count = used_count + 1 
           WHERE code = $1`,
          [promoCode]
        );
      }

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get orders for consumer
  static async getConsumerOrders(consumerId) {
    const query = `
      SELECT 
        o.*,
        pr.farm_name,
        pr.full_name as farmer_name,
        ca.full_address as delivery_address,
        ca.city,
        ca.state,
        ca.postal_code
      FROM orders o
      INNER JOIN profiles pr ON o.farmer_id = pr.user_id
      LEFT JOIN consumer_addresses ca ON o.delivery_address_id = ca.address_id
      WHERE o.consumer_id = $1
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query, [consumerId]);
    return result.rows;
  }

  // Get order details with items
  static async getOrderDetails(orderId, consumerId) {
    const orderQuery = `
      SELECT 
        o.*,
        pr.farm_name,
        pr.full_name as farmer_name,
        ca.full_address as delivery_address,
        ca.city,
        ca.state,
        ca.postal_code
      FROM orders o
      INNER JOIN profiles pr ON o.farmer_id = pr.user_id
      LEFT JOIN consumer_addresses ca ON o.delivery_address_id = ca.address_id
      WHERE o.order_id = $1 AND o.consumer_id = $2
    `;
    const orderResult = await pool.query(orderQuery, [orderId, consumerId]);
    if (orderResult.rows.length === 0) {
      return null;
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsQuery = `
      SELECT 
        oi.*,
        p.variety_name,
        p.rice_type,
        (SELECT array_agg(image_url ORDER BY image_order) 
         FROM product_images 
         WHERE product_id = p.product_id) as images
      FROM order_items oi
      INNER JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id = $1
    `;
    const itemsResult = await pool.query(itemsQuery, [orderId]);
    order.items = itemsResult.rows;

    return order;
  }

  // Get orders for farmer
  static async getFarmerOrders(farmerId) {
    const query = `
      SELECT 
        o.*,
        u.email as consumer_email,
        u.phone as consumer_phone,
        ca.full_address as delivery_address
      FROM orders o
      INNER JOIN users u ON o.consumer_id = u.user_id
      LEFT JOIN consumer_addresses ca ON o.delivery_address_id = ca.address_id
      WHERE o.farmer_id = $1
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query, [farmerId]);
    return result.rows;
  }

  // Update order status (for farmer)
  static async updateStatus(orderId, farmerId, status) {
    const result = await pool.query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE order_id = $2 AND farmer_id = $3
       RETURNING *`,
      [status, orderId, farmerId]
    );
    return result.rows[0];
  }

  // Validate and apply promo code (OC-4)
  static async validatePromoCode(code, orderAmount) {
    const query = `
      SELECT * FROM promo_codes
      WHERE code = $1 
        AND is_active = TRUE
        AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
        AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
        AND (usage_limit IS NULL OR used_count < usage_limit)
        AND min_order_amount <= $2
    `;
    const result = await pool.query(query, [code.toUpperCase(), parseFloat(orderAmount)]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const promo = result.rows[0];
    let discountAmount = 0;

    if (promo.discount_type === 'PERCENTAGE') {
      discountAmount = (orderAmount * parseFloat(promo.discount_value)) / 100;
      if (promo.max_discount_amount) {
        discountAmount = Math.min(discountAmount, parseFloat(promo.max_discount_amount));
      }
    } else {
      discountAmount = parseFloat(promo.discount_value);
    }

    return {
      code: promo.code,
      discount_amount: discountAmount,
      discount_type: promo.discount_type,
      description: promo.description
    };
  }

  // Calculate delivery fee (OM-7 placeholder - can be enhanced with distance calculation)
  static calculateDeliveryFee(farmerLat, farmerLng, consumerLat, consumerLng, baseFee = 50) {
    // For now, return base fee
    // In the future, this can calculate based on distance
    return baseFee;
  }
}

module.exports = Order;

