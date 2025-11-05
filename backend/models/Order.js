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
        payment_type VARCHAR(20) DEFAULT 'DIGITAL' CHECK (payment_type IN ('DIGITAL', 'COD')),
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
      CREATE TABLE IF NOT EXISTS order_rejections (
        rejection_id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        reason VARCHAR(100) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
      CREATE INDEX IF NOT EXISTS idx_order_rejections_order_id ON order_rejections(order_id);
    `;

    // Add payment_type column if it doesn't exist (for existing tables)
    const migrationQuery = `
      DO $$ 
      BEGIN 
        -- Add column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'payment_type'
        ) THEN
          ALTER TABLE orders ADD COLUMN payment_type VARCHAR(20) DEFAULT 'DIGITAL';
        END IF;
        
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'orders_payment_type_check'
        ) THEN
          ALTER TABLE orders ADD CONSTRAINT orders_payment_type_check 
            CHECK (payment_type IN ('DIGITAL', 'COD'));
        END IF;
      END $$;
    `;

    try {
      await pool.query(query);
      // Run migration for existing tables
      try {
        await pool.query(migrationQuery);
      } catch (migrationError) {
        // Ignore migration errors (column might already exist)
        console.log('Migration note:', migrationError.message);
      }
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
      paymentType = 'DIGITAL', // 'DIGITAL' or 'COD'
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

      // Determine payment type from orderData
      const finalPaymentType = paymentType || (paymentMethodId === 'COD' ? 'COD' : 'DIGITAL');
      const finalPaymentMethodId = finalPaymentType === 'COD' ? null : paymentMethodId;

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (
          consumer_id, farmer_id, order_number, delivery_address_id, payment_method_id, payment_type,
          subtotal, delivery_fee, tax, discount_amount, promo_code, total_amount, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          consumerId, farmerId, orderNumber, deliveryAddressId, finalPaymentMethodId, finalPaymentType,
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

  // Get orders for farmer (OM-2)
  static async getFarmerOrders(farmerId, status = null) {
    let query = `
      SELECT 
        o.*,
        u.email as consumer_email,
        u.phone as consumer_phone,
        ca.full_address as delivery_address,
        ca.city,
        ca.state,
        ca.postal_code,
        json_agg(
          json_build_object(
            'order_item_id', oi.order_item_id,
            'product_id', oi.product_id,
            'product_name', p.variety_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'sack_size_kg', oi.sack_size_kg,
            'subtotal', oi.subtotal
          )
        ) FILTER (WHERE oi.order_item_id IS NOT NULL) as items
      FROM orders o
      INNER JOIN users u ON o.consumer_id = u.user_id
      LEFT JOIN consumer_addresses ca ON o.delivery_address_id = ca.address_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.product_id
      WHERE o.farmer_id = $1
    `;
    const params = [farmerId];
    
    if (status) {
      query += ` AND o.status = $2`;
      params.push(status);
    }
    
    query += ` GROUP BY o.order_id, u.email, u.phone, ca.full_address, ca.city, ca.state, ca.postal_code
      ORDER BY o.created_at DESC
    `;
    
    const result = await pool.query(query, params);
    return result.rows;
  }
  
  // Get order details for farmer (OM-2)
  static async getFarmerOrderDetails(orderId, farmerId) {
    const query = `
      SELECT 
        o.*,
        u.email as consumer_email,
        u.phone as consumer_phone,
        ca.full_address as delivery_address,
        ca.city,
        ca.state,
        ca.postal_code,
        json_agg(
          json_build_object(
            'order_item_id', oi.order_item_id,
            'product_id', oi.product_id,
            'product_name', p.variety_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'sack_size_kg', oi.sack_size_kg,
            'subtotal', oi.subtotal
          )
        ) FILTER (WHERE oi.order_item_id IS NOT NULL) as items
      FROM orders o
      INNER JOIN users u ON o.consumer_id = u.user_id
      LEFT JOIN consumer_addresses ca ON o.delivery_address_id = ca.address_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.product_id
      WHERE o.order_id = $1 AND o.farmer_id = $2
      GROUP BY o.order_id, u.email, u.phone, ca.full_address, ca.city, ca.state, ca.postal_code
    `;
    const result = await pool.query(query, [orderId, farmerId]);
    return result.rows[0] || null;
  }

  // Accept order (OM-3)
  static async acceptOrder(orderId, farmerId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if order is still pending and within timeframe (24 hours)
      const orderCheck = await client.query(
        `SELECT * FROM orders 
         WHERE order_id = $1 AND farmer_id = $2 AND status = 'PENDING'
         AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
        [orderId, farmerId]
      );
      
      if (orderCheck.rows.length === 0) {
        throw new Error('Order not found, not pending, or past acceptance timeframe');
      }
      
      // Update status to CONFIRMED
      const result = await client.query(
        `UPDATE orders 
         SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP 
         WHERE order_id = $1 AND farmer_id = $2
         RETURNING *`,
        [orderId, farmerId]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Reject order (OM-3)
  static async rejectOrder(orderId, farmerId, reason, notes = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if order is still pending
      const orderCheck = await client.query(
        `SELECT * FROM orders 
         WHERE order_id = $1 AND farmer_id = $2 AND status = 'PENDING'`,
        [orderId, farmerId]
      );
      
      if (orderCheck.rows.length === 0) {
        throw new Error('Order not found or not in pending status');
      }
      
      // Record rejection
      await client.query(
        `INSERT INTO order_rejections (order_id, reason, notes)
         VALUES ($1, $2, $3)`,
        [orderId, reason, notes]
      );
      
      // Update status to CANCELLED
      const result = await client.query(
        `UPDATE orders 
         SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
         WHERE order_id = $1 AND farmer_id = $2
         RETURNING *`,
        [orderId, farmerId]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Update order status (OM-4)
  static async updateStatus(orderId, farmerId, status) {
    // Validate status transition
    const validStatuses = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status for this operation');
    }
    
    // Check current status and validate transition
    const currentOrder = await pool.query(
      `SELECT status FROM orders WHERE order_id = $1 AND farmer_id = $2`,
      [orderId, farmerId]
    );
    
    if (currentOrder.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const currentStatus = currentOrder.rows[0].status;
    
    // Validate status transition
    const validTransitions = {
      'CONFIRMED': ['PREPARING', 'OUT_FOR_DELIVERY'],
      'PREPARING': ['OUT_FOR_DELIVERY'],
      'OUT_FOR_DELIVERY': ['DELIVERED']
    };
    
    if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${status}`);
    }
    
    const result = await pool.query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE order_id = $2 AND farmer_id = $3
       RETURNING *`,
      [status, orderId, farmerId]
    );
    return result.rows[0];
  }
  
  // Cancel order by consumer (only if pending)
  static async cancelOrderByConsumer(orderId, consumerId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if order exists, belongs to consumer, and is pending
      const orderCheck = await client.query(
        `SELECT * FROM orders 
         WHERE order_id = $1 AND consumer_id = $2 AND status = 'PENDING'`,
        [orderId, consumerId]
      );

      if (orderCheck.rows.length === 0) {
        throw new Error('Order not found, not yours, or not in pending status');
      }

      // Get order items to restore inventory
      const orderItems = await client.query(
        `SELECT product_id, quantity, sack_size_kg FROM order_items WHERE order_id = $1`,
        [orderId]
      );

      // Update status to CANCELLED
      const result = await client.query(
        `UPDATE orders 
         SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
         WHERE order_id = $1 AND consumer_id = $2
         RETURNING *`,
        [orderId, consumerId]
      );

      // Restore inventory for each item (PM-4)
      const Product = require('./Product');
      for (const item of orderItems.rows) {
        const quantityToRestore = item.sack_size_kg 
          ? parseFloat(item.quantity) * parseFloat(item.sack_size_kg) // Convert sacks to kg
          : parseFloat(item.quantity); // Already in kg
        await Product.incrementInventory(item.product_id, quantityToRestore);
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Auto-cancel pending orders past 24 hours (OM-3)
  static async autoCancelPendingOrders() {
    const result = await pool.query(
      `UPDATE orders 
       SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
       WHERE status = 'PENDING' 
       AND created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
       RETURNING *`
    );
    
    // Send notifications for auto-cancelled orders (OM-6)
    if (result.rows.length > 0) {
      const Notification = require('./Notification');
      for (const order of result.rows) {
        try {
          await Notification.createNotification(
            order.consumer_id,
            'ORDER_CANCELLED',
            'Order Auto-Cancelled',
            `Your order ${order.order_number} was cancelled as the farmer did not respond within 24 hours.`,
            order.order_id
          );
        } catch (error) {
          console.error(`Error sending notification for order ${order.order_id}:`, error);
        }
      }
    }
    
    return result.rows;
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

  // Calculate delivery fee (OM-7) - Now uses Notification model
  static async calculateDeliveryFee(farmerLat, farmerLng, consumerLat, consumerLng) {
    const Notification = require('./Notification');
    return await Notification.calculateDeliveryFee(farmerLat, farmerLng, consumerLat, consumerLng);
  }
}

module.exports = Order;

