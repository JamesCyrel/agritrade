const pool = require('../config/database');

class Notification {
  // Create notifications table (OM-6)
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS delivery_fee_settings (
        setting_id SERIAL PRIMARY KEY,
        base_fee DECIMAL(10, 2) NOT NULL DEFAULT 50,
        price_per_km DECIMAL(10, 2) NOT NULL DEFAULT 5,
        max_fee DECIMAL(10, 2),
        min_fee DECIMAL(10, 2) DEFAULT 20,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES users(user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    `;

    try {
      await pool.query(query);
      
      // Insert default delivery fee settings if not exists
      const settingsCheck = await pool.query('SELECT * FROM delivery_fee_settings LIMIT 1');
      if (settingsCheck.rows.length === 0) {
        await pool.query(`
          INSERT INTO delivery_fee_settings (base_fee, price_per_km, min_fee, max_fee)
          VALUES (50, 5, 20, 500)
        `);
      }

      // Add latitude/longitude to consumer_addresses if not exists
      const migrationQuery = `
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'consumer_addresses' AND column_name = 'latitude'
          ) THEN
            ALTER TABLE consumer_addresses ADD COLUMN latitude DECIMAL(10,7);
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'consumer_addresses' AND column_name = 'longitude'
          ) THEN
            ALTER TABLE consumer_addresses ADD COLUMN longitude DECIMAL(10,7);
          END IF;
        END $$;
      `;
      
      await pool.query(migrationQuery);
      
      console.log('✅ Notification and delivery fee tables created/verified');
    } catch (error) {
      console.error('❌ Error creating notification tables:', error);
      throw error;
    }
  }

  // Create notification (OM-6)
  static async createNotification(userId, type, title, message, orderId = null) {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, order_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, orderId, type, title, message]
    );
    return result.rows[0];
  }

  // Get user notifications
  static async getUserNotifications(userId, limit = 50) {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE notification_id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    return result.rows[0];
  }

  // Mark all notifications as read
  static async markAllAsRead(userId) {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
  }

  // Get unread count
  static async getUnreadCount(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  // Get delivery fee settings (OM-7)
  static async getDeliveryFeeSettings() {
    const result = await pool.query(
      `SELECT * FROM delivery_fee_settings ORDER BY setting_id DESC LIMIT 1`
    );
    return result.rows[0] || {
      base_fee: 50,
      price_per_km: 5,
      min_fee: 20,
      max_fee: 500
    };
  }

  // Update delivery fee settings (OM-7)
  static async updateDeliveryFeeSettings(settings, updatedBy) {
    const { base_fee, price_per_km, min_fee, max_fee } = settings;
    
    // Check if settings exist
    const existing = await pool.query('SELECT * FROM delivery_fee_settings LIMIT 1');
    
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO delivery_fee_settings (base_fee, price_per_km, min_fee, max_fee, updated_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [base_fee, price_per_km, min_fee || null, max_fee || null, updatedBy]
      );
    } else {
      await pool.query(
        `UPDATE delivery_fee_settings
         SET base_fee = $1, price_per_km = $2, min_fee = $3, max_fee = $4, updated_by = $5, updated_at = NOW()
         WHERE setting_id = (SELECT setting_id FROM delivery_fee_settings ORDER BY setting_id DESC LIMIT 1)`,
        [base_fee, price_per_km, min_fee || null, max_fee || null, updatedBy]
      );
    }
    
    return await this.getDeliveryFeeSettings();
  }

  // Calculate distance using Haversine formula (OM-7)
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  // Calculate delivery fee based on distance (OM-7)
  static async calculateDeliveryFee(farmerLat, farmerLng, consumerLat, consumerLng) {
    const settings = await this.getDeliveryFeeSettings();
    
    // If coordinates are missing, return base fee
    if (!farmerLat || !farmerLng || !consumerLat || !consumerLng) {
      return parseFloat(settings.base_fee);
    }

    // Calculate distance
    const distance = this.calculateDistance(
      parseFloat(farmerLat),
      parseFloat(farmerLng),
      parseFloat(consumerLat),
      parseFloat(consumerLng)
    );

    // Calculate fee: base_fee + (distance * price_per_km)
    let fee = parseFloat(settings.base_fee) + (distance * parseFloat(settings.price_per_km));

    // Apply min/max constraints
    if (settings.min_fee && fee < parseFloat(settings.min_fee)) {
      fee = parseFloat(settings.min_fee);
    }
    if (settings.max_fee && fee > parseFloat(settings.max_fee)) {
      fee = parseFloat(settings.max_fee);
    }

    return Math.round(fee * 100) / 100; // Round to 2 decimal places
  }
}

module.exports = Notification;

