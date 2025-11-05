const pool = require('../config/database');

class Payment {
  // Create payment system tables
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS payment_transactions (
        transaction_id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CARD', 'WALLET', 'UPI', 'COD')),
        payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED')),
        amount DECIMAL(10, 2) NOT NULL,
        gateway_transaction_id VARCHAR(255),
        gateway_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS farmer_ledger (
        ledger_id SERIAL PRIMARY KEY,
        farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('EARNING', 'COMMISSION', 'PAYOUT', 'REFUND', 'COD_FEE')),
        amount DECIMAL(10, 2) NOT NULL,
        balance_before DECIMAL(10, 2) NOT NULL,
        balance_after DECIMAL(10, 2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS farmer_payouts (
        payout_id SERIAL PRIMARY KEY,
        farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        payout_period_start DATE NOT NULL,
        payout_period_end DATE NOT NULL,
        total_earnings DECIMAL(10, 2) NOT NULL,
        commission_amount DECIMAL(10, 2) NOT NULL,
        net_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
        bank_account_number VARCHAR(50),
        bank_name VARCHAR(100),
        branch_code VARCHAR(20),
        payout_date DATE,
        transaction_reference VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cod_settings (
        setting_id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        is_enabled BOOLEAN DEFAULT TRUE,
        min_order_amount DECIMAL(10, 2) DEFAULT 0,
        max_order_amount DECIMAL(10, 2),
        allowed_areas TEXT[], -- Array of allowed areas/cities
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(farmer_id)
      );

      CREATE TABLE IF NOT EXISTS cod_eligibility (
        eligibility_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        is_eligible BOOLEAN DEFAULT TRUE,
        reason TEXT,
        max_order_value DECIMAL(10, 2),
        restrictions TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(payment_status);
      CREATE INDEX IF NOT EXISTS idx_farmer_ledger_farmer_id ON farmer_ledger(farmer_id);
      CREATE INDEX IF NOT EXISTS idx_farmer_ledger_order_id ON farmer_ledger(order_id);
      CREATE INDEX IF NOT EXISTS idx_farmer_payouts_farmer_id ON farmer_payouts(farmer_id);
      CREATE INDEX IF NOT EXISTS idx_farmer_payouts_status ON farmer_payouts(status);
      CREATE INDEX IF NOT EXISTS idx_cod_settings_farmer_id ON cod_settings(farmer_id);
      CREATE INDEX IF NOT EXISTS idx_cod_eligibility_user_id ON cod_eligibility(user_id);
    `;

    try {
      await pool.query(query);
      console.log('✅ Payment tables created/verified');
    } catch (error) {
      console.error('❌ Error creating payment tables:', error);
      throw error;
    }
  }

  // Create payment transaction (PS-1, PS-2)
  static async createTransaction(orderId, paymentMethod, amount, gatewayTransactionId = null, gatewayResponse = null) {
    const result = await pool.query(
      `INSERT INTO payment_transactions (order_id, payment_method, amount, gateway_transaction_id, gateway_response, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orderId, paymentMethod, parseFloat(amount), gatewayTransactionId, gatewayResponse, paymentMethod === 'COD' ? 'PENDING' : 'PROCESSING']
    );
    return result.rows[0];
  }

  // Update payment transaction status
  static async updateTransactionStatus(transactionId, status, gatewayResponse = null) {
    const result = await pool.query(
      `UPDATE payment_transactions 
       SET payment_status = $1, gateway_response = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE transaction_id = $3
       RETURNING *`,
      [status, gatewayResponse, transactionId]
    );
    return result.rows[0];
  }

  // Get transaction by order ID
  static async getTransactionByOrderId(orderId) {
    const result = await pool.query(
      `SELECT * FROM payment_transactions WHERE order_id = $1`,
      [orderId]
    );
    return result.rows[0] || null;
  }

  // Add ledger entry (PS-3)
  static async addLedgerEntry(farmerId, orderId, transactionType, amount, description = null) {
    // Get current balance
    const currentBalance = await this.getFarmerBalance(farmerId);
    const balanceBefore = currentBalance;
    const balanceAfter = balanceBefore + parseFloat(amount);

    const result = await pool.query(
      `INSERT INTO farmer_ledger (farmer_id, order_id, transaction_type, amount, balance_before, balance_after, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [farmerId, orderId, transactionType, parseFloat(amount), balanceBefore, balanceAfter, description]
    );
    return result.rows[0];
  }

  // Get farmer current balance
  static async getFarmerBalance(farmerId) {
    const result = await pool.query(
      `SELECT balance_after FROM farmer_ledger 
       WHERE farmer_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [farmerId]
    );
    return result.rows.length > 0 ? parseFloat(result.rows[0].balance_after) : 0;
  }

  // Get farmer ledger entries
  static async getFarmerLedger(farmerId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM farmer_ledger 
       WHERE farmer_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [farmerId, limit, offset]
    );
    return result.rows;
  }

  // Create payout (PS-3)
  static async createPayout(farmerId, periodStart, periodEnd, totalEarnings, commissionAmount, bankDetails) {
    const netAmount = totalEarnings - commissionAmount;
    const result = await pool.query(
      `INSERT INTO farmer_payouts (farmer_id, payout_period_start, payout_period_end, total_earnings, commission_amount, net_amount, bank_account_number, bank_name, branch_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [farmerId, periodStart, periodEnd, totalEarnings, commissionAmount, netAmount, bankDetails.account_number, bankDetails.bank_name, bankDetails.branch_code]
    );
    return result.rows[0];
  }

  // Update payout status
  static async updatePayoutStatus(payoutId, status, transactionReference = null, payoutDate = null) {
    const result = await pool.query(
      `UPDATE farmer_payouts 
       SET status = $1, transaction_reference = $2, payout_date = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE payout_id = $4
       RETURNING *`,
      [status, transactionReference, payoutDate, payoutId]
    );
    return result.rows[0];
  }

  // Get farmer payouts
  static async getFarmerPayouts(farmerId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM farmer_payouts 
       WHERE farmer_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [farmerId, limit, offset]
    );
    return result.rows;
  }

  // COD Settings (PS-2)
  static async getCODSettings(farmerId) {
    const result = await pool.query(
      `SELECT * FROM cod_settings WHERE farmer_id = $1`,
      [farmerId]
    );
    return result.rows[0] || null;
  }

  static async updateCODSettings(farmerId, settings) {
    const { is_enabled, min_order_amount, max_order_amount, allowed_areas } = settings;
    const result = await pool.query(
      `INSERT INTO cod_settings (farmer_id, is_enabled, min_order_amount, max_order_amount, allowed_areas)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (farmer_id) 
       DO UPDATE SET 
         is_enabled = EXCLUDED.is_enabled,
         min_order_amount = EXCLUDED.min_order_amount,
         max_order_amount = EXCLUDED.max_order_amount,
         allowed_areas = EXCLUDED.allowed_areas,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [farmerId, is_enabled !== undefined ? is_enabled : true, min_order_amount || 0, max_order_amount || null, allowed_areas || null]
    );
    return result.rows[0];
  }

  // COD Eligibility (PS-2)
  static async checkCODEligibility(userId, orderAmount, farmerId = null) {
    // Check user eligibility
    const userEligibility = await pool.query(
      `SELECT * FROM cod_eligibility WHERE user_id = $1`,
      [userId]
    );
    
    if (userEligibility.rows.length > 0) {
      const eligibility = userEligibility.rows[0];
      if (!eligibility.is_eligible) {
        return { eligible: false, reason: eligibility.reason || 'User not eligible for COD' };
      }
      if (eligibility.max_order_value && parseFloat(orderAmount) > parseFloat(eligibility.max_order_value)) {
        return { eligible: false, reason: `Order amount exceeds COD limit of ₱${eligibility.max_order_value}` };
      }
    }

    // Check farmer COD settings if farmerId provided
    if (farmerId) {
      const codSettings = await this.getCODSettings(farmerId);
      if (codSettings && !codSettings.is_enabled) {
        return { eligible: false, reason: 'Farmer does not accept COD' };
      }
      if (codSettings) {
        if (codSettings.min_order_amount && parseFloat(orderAmount) < parseFloat(codSettings.min_order_amount)) {
          return { eligible: false, reason: `Order amount must be at least ₱${codSettings.min_order_amount} for COD` };
        }
        if (codSettings.max_order_amount && parseFloat(orderAmount) > parseFloat(codSettings.max_order_amount)) {
          return { eligible: false, reason: `Order amount exceeds COD limit of ₱${codSettings.max_order_amount}` };
        }
      }
    }

    return { eligible: true };
  }

  static async updateCODEligibility(userId, eligibility) {
    const { is_eligible, reason, max_order_value, restrictions } = eligibility;
    const result = await pool.query(
      `INSERT INTO cod_eligibility (user_id, is_eligible, reason, max_order_value, restrictions)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         is_eligible = EXCLUDED.is_eligible,
         reason = EXCLUDED.reason,
         max_order_value = EXCLUDED.max_order_value,
         restrictions = EXCLUDED.restrictions,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, is_eligible !== undefined ? is_eligible : true, reason || null, max_order_value || null, restrictions || null]
    );
    return result.rows[0];
  }
}

module.exports = Payment;

