const pool = require('../config/database');

class Consumer {
  // Create consumer-specific tables
  static async createTables() {
    const query = `
      CREATE TABLE IF NOT EXISTS consumer_addresses (
        address_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        label VARCHAR(100),
        full_address TEXT NOT NULL,
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS consumer_payment_methods (
        payment_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('CARD', 'WALLET', 'UPI')),
        card_number_last4 VARCHAR(4),
        card_holder_name VARCHAR(255),
        expiry_month INTEGER,
        expiry_year INTEGER,
        upi_id VARCHAR(255),
        wallet_provider VARCHAR(50),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON consumer_addresses(user_id);
      CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON consumer_payment_methods(user_id);
    `;

    try {
      await pool.query(query);
      console.log('✅ Consumer tables created/verified');
    } catch (error) {
      console.error('❌ Error creating consumer tables:', error);
      throw error;
    }
  }

  // Get consumer profile
  static async getProfile(userId) {
    const result = await pool.query(`
      SELECT p.full_name, u.email, u.phone
      FROM profiles p
      JOIN users u ON u.user_id = p.user_id
      WHERE p.user_id = $1
    `, [userId]);
    return result.rows[0] || null;
  }

  // Update consumer profile (full_name)
  static async updateProfile(userId, fullName) {
    const result = await pool.query(`
      UPDATE profiles 
      SET full_name = $2, updated_at = NOW()
      WHERE user_id = $1
      RETURNING full_name
    `, [userId, fullName]);
    return result.rows[0];
  }

  // Address methods
  static async getAddresses(userId) {
    const result = await pool.query(`
      SELECT address_id, label, full_address, city, state, postal_code, is_default
      FROM consumer_addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at DESC
    `, [userId]);
    return result.rows;
  }

  static async addAddress(userId, addressData) {
    const { label, full_address, city, state, postal_code, is_default } = addressData;
    
    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query(`
        UPDATE consumer_addresses SET is_default = FALSE WHERE user_id = $1
      `, [userId]);
    }

    const result = await pool.query(`
      INSERT INTO consumer_addresses (user_id, label, full_address, city, state, postal_code, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING address_id, label, full_address, city, state, postal_code, is_default
    `, [userId, label || null, full_address, city || null, state || null, postal_code || null, is_default || false]);
    return result.rows[0];
  }

  static async updateAddress(userId, addressId, addressData) {
    const { label, full_address, city, state, postal_code, is_default } = addressData;
    
    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query(`
        UPDATE consumer_addresses SET is_default = FALSE WHERE user_id = $1 AND address_id != $2
      `, [userId, addressId]);
    }

    const result = await pool.query(`
      UPDATE consumer_addresses
      SET label = $3, full_address = $4, city = $5, state = $6, postal_code = $7, is_default = $8, updated_at = NOW()
      WHERE address_id = $2 AND user_id = $1
      RETURNING address_id, label, full_address, city, state, postal_code, is_default
    `, [userId, addressId, label || null, full_address, city || null, state || null, postal_code || null, is_default || false]);
    return result.rows[0];
  }

  static async deleteAddress(userId, addressId) {
    const result = await pool.query(`
      DELETE FROM consumer_addresses
      WHERE address_id = $1 AND user_id = $2
      RETURNING address_id
    `, [addressId, userId]);
    return result.rows[0];
  }

  // Payment methods
  static async getPaymentMethods(userId) {
    const result = await pool.query(`
      SELECT payment_id, payment_type, card_number_last4, card_holder_name, 
             expiry_month, expiry_year, upi_id, wallet_provider, is_default
      FROM consumer_payment_methods
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at DESC
    `, [userId]);
    return result.rows;
  }

  static async addPaymentMethod(userId, paymentData) {
    const { payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default } = paymentData;
    
    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query(`
        UPDATE consumer_payment_methods SET is_default = FALSE WHERE user_id = $1
      `, [userId]);
    }

    const result = await pool.query(`
      INSERT INTO consumer_payment_methods 
        (user_id, payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING payment_id, payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default
    `, [userId, payment_type, card_number_last4 || null, card_holder_name || null, expiry_month || null, expiry_year || null, upi_id || null, wallet_provider || null, is_default || false]);
    return result.rows[0];
  }

  static async updatePaymentMethod(userId, paymentId, paymentData) {
    const { payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default } = paymentData;
    
    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query(`
        UPDATE consumer_payment_methods SET is_default = FALSE WHERE user_id = $1 AND payment_id != $2
      `, [userId, paymentId]);
    }

    const result = await pool.query(`
      UPDATE consumer_payment_methods
      SET payment_type = $3, card_number_last4 = $4, card_holder_name = $5, 
          expiry_month = $6, expiry_year = $7, upi_id = $8, wallet_provider = $9, 
          is_default = $10, updated_at = NOW()
      WHERE payment_id = $2 AND user_id = $1
      RETURNING payment_id, payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default
    `, [userId, paymentId, payment_type, card_number_last4 || null, card_holder_name || null, expiry_month || null, expiry_year || null, upi_id || null, wallet_provider || null, is_default || false]);
    return result.rows[0];
  }

  static async deletePaymentMethod(userId, paymentId) {
    const result = await pool.query(`
      DELETE FROM consumer_payment_methods
      WHERE payment_id = $1 AND user_id = $2
      RETURNING payment_id
    `, [paymentId, userId]);
    return result.rows[0];
  }
}

module.exports = Consumer;

