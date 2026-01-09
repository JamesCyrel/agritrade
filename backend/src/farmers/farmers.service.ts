
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class FarmersService implements OnModuleInit {
  constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

  async onModuleInit() {
    await this.createVerificationTables();
    await this.createLedgerAndPayoutTables();
  }

  async createLedgerAndPayoutTables() {
    const query = `
      CREATE TABLE IF NOT EXISTS farmer_ledger (
        ledger_id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2),
        transaction_type VARCHAR(20) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS farmer_payouts (
        payout_id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        commission_amount DECIMAL(10,2) DEFAULT 0,
        net_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        bank_name VARCHAR(100),
        bank_account_number VARCHAR(50),
        period_start DATE,
        period_end DATE,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS commission_settings (
        setting_id SERIAL PRIMARY KEY,
        commission_rate DECIMAL(5,4) DEFAULT 0.05,
        min_commission DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Insert default commission settings if not exists
      INSERT INTO commission_settings (commission_rate, min_commission)
      SELECT 0.05, 0
      WHERE NOT EXISTS (SELECT 1 FROM commission_settings);
      
      CREATE INDEX IF NOT EXISTS idx_farmer_ledger_farmer_id ON farmer_ledger(farmer_id);
      CREATE INDEX IF NOT EXISTS idx_farmer_payouts_farmer_id ON farmer_payouts(farmer_id);
    `;
    try {
      await this.pool.query(query);
      console.log('✅ Farmer ledger and payout tables created/verified');
    } catch (error) {
      console.error('❌ Error creating farmer ledger tables:', error);
    }
  }

  async createVerificationTables() {
    const query = `
      DO $$ BEGIN
        BEGIN ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7); EXCEPTION WHEN undefined_table THEN NULL; END;
        BEGIN ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7); EXCEPTION WHEN undefined_table THEN NULL; END;
        BEGIN ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_reason TEXT; EXCEPTION WHEN undefined_table THEN NULL; END;
      END $$;

      CREATE TABLE IF NOT EXISTS verification_documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        doc_type VARCHAR(50) NOT NULL,
        file_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ver_docs_user ON verification_documents(user_id);
    `;
    await this.pool.query(query);
  }

  async getProfile(userId: number) {
    const res = await this.pool.query(
      `SELECT profile_id, user_id, full_name, farm_name, address, bank_account_number, bank_name, branch_code, verification_status, latitude, longitude
       FROM profiles WHERE user_id=$1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  async updateProfile(userId: number, data: any) {
    const {
      full_name,
      farm_name,
      address,
      bank_account_number,
      bank_name,
      branch_code,
      latitude,
      longitude,
    } = data;

    const query = `
      INSERT INTO profiles (
        user_id, full_name, farm_name, address, bank_account_number,
        bank_name, branch_code, verification_status, latitude, longitude
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        COALESCE((SELECT verification_status FROM profiles WHERE user_id=$1),'PENDING_DOCUMENTS'),
        $8,$9
      )
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        farm_name = EXCLUDED.farm_name,
        address = EXCLUDED.address,
        bank_account_number = EXCLUDED.bank_account_number,
        bank_name = EXCLUDED.bank_name,
        branch_code = EXCLUDED.branch_code,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        updated_at = NOW()
      RETURNING profile_id, user_id, full_name, farm_name, address, bank_account_number, bank_name, branch_code, verification_status, latitude, longitude;
    `;
    const params = [userId, full_name || null, farm_name || null, address || null, bank_account_number || null, bank_name || null, branch_code || null, latitude || null, longitude || null];
    const res = await this.pool.query(query, params);

    // Keep status at PENDING_DOCUMENTS or update if needed logic from controller is moved here partly
    // But original controller calls setVerificationStatus explicitly.
    // We will follow the controller logic in the controller or a higher level method.

    return res.rows[0];
  }

  async setVerificationStatus(userId: number, status: string, reason: string | null = null) {
    const res = await this.pool.query(
      `UPDATE profiles SET verification_status=$2, updated_at=NOW(), verification_reason=$3 WHERE user_id=$1 RETURNING verification_status`,
      [userId, status, reason]
    );
    return res.rows[0];
  }

  async addDocument(userId: number, docType: string, fileData: string) {
    const res = await this.pool.query(
      `INSERT INTO verification_documents(user_id, doc_type, file_data) VALUES($1,$2,$3) RETURNING id, doc_type, created_at`,
      [userId, docType, fileData || null]
    );
    return res.rows[0];
  }

  async listDocuments(userId: number) {
    const res = await this.pool.query(
      `SELECT id, doc_type, created_at FROM verification_documents WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  // ===================== Farmer Orders =====================
  async getOrders(farmerId: number, status?: string) {
    let query = `
            SELECT o.*, 
                   u.email as consumer_email, u.phone as consumer_phone,
                   p.full_name as consumer_name,
                   ca.full_address, ca.city, ca.state, ca.postal_code,
                   COALESCE(
                       (SELECT json_agg(json_build_object(
                           'order_item_id', oi.order_item_id,
                           'product_id', oi.product_id,
                           'quantity', oi.quantity,
                           'unit_price', oi.unit_price,
                           'subtotal', oi.subtotal,
                           'name', pr.variety_name,
                           'variety_name', pr.variety_name,
                           'rice_type', pr.rice_type
                       )) FROM order_items oi 
                       LEFT JOIN products pr ON oi.product_id = pr.product_id 
                       WHERE oi.order_id = o.order_id),
                       '[]'::json
                   ) as items
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.user_id
            LEFT JOIN profiles p ON o.user_id = p.user_id
            LEFT JOIN consumer_addresses ca ON o.address_id = ca.address_id
            WHERE o.farmer_id = $1
        `;
    const params: any[] = [farmerId];

    if (status) {
      query += ` AND o.status = $2`;
      params.push(status);
    }
    query += ` ORDER BY o.created_at DESC`;

    const res = await this.pool.query(query, params);
    return res.rows;
  }

  async getOrderDetails(farmerId: number, orderId: number) {
    const res = await this.pool.query(`
            SELECT o.*, 
                   u.email as consumer_email, u.phone as consumer_phone,
                   p.full_name as consumer_name,
                   ca.full_address, ca.city, ca.state, ca.postal_code,
                   (SELECT json_agg(json_build_object(
                       'order_item_id', oi.order_item_id,
                       'product_id', oi.product_id,
                       'quantity', oi.quantity,
                       'unit_price', oi.unit_price,
                       'subtotal', oi.subtotal,
                       'variety_name', pr.variety_name,
                       'rice_type', pr.rice_type,
                       'images', (SELECT array_agg(pi.image_url ORDER BY pi.image_order) FROM product_images pi WHERE pi.product_id = pr.product_id)
                   )) FROM order_items oi 
                   LEFT JOIN products pr ON oi.product_id = pr.product_id 
                   WHERE oi.order_id = o.order_id) as items
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.user_id
            LEFT JOIN profiles p ON o.user_id = p.user_id
            LEFT JOIN consumer_addresses ca ON o.address_id = ca.address_id
            WHERE o.order_id = $1 AND o.farmer_id = $2
        `, [orderId, farmerId]);

    if (!res.rows[0]) return null;

    const order = res.rows[0];
    
    // Use stored values if available, otherwise calculate from total_amount for backward compatibility
    let subtotal = parseFloat(order.subtotal) || 0;
    let deliveryFee = parseFloat(order.delivery_fee) || 0;
    let tax = parseFloat(order.tax) || 0;
    const discountAmount = parseFloat(order.discount_amount) || 0;
    const totalAmount = parseFloat(order.total_amount) || 0;

    // Backward compatibility: if subtotal is 0 but total_amount exists, calculate the values
    if (subtotal === 0 && totalAmount > 0) {
      deliveryFee = 50;
      subtotal = (totalAmount - deliveryFee) / 1.12;
      tax = subtotal * 0.12;
    }

    return {
      ...order,
      subtotal: subtotal.toFixed(2),
      delivery_fee: deliveryFee.toFixed(2),
      tax: tax.toFixed(2),
      discount_amount: discountAmount.toFixed(2)
    };
  }

  async acceptOrder(farmerId: number, orderId: number) {
    const res = await this.pool.query(`
            UPDATE orders SET status = 'CONFIRMED', updated_at = NOW()
            WHERE order_id = $1 AND farmer_id = $2 AND status = 'PENDING'
            RETURNING *
        `, [orderId, farmerId]);
    return res.rows[0] || null;
  }

  async rejectOrder(farmerId: number, orderId: number, reason: string, notes?: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(`
                UPDATE orders SET status = 'REJECTED', updated_at = NOW()
                WHERE order_id = $1 AND farmer_id = $2 AND status = 'PENDING'
                RETURNING *
            `, [orderId, farmerId]);

      if (orderRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query(`
                INSERT INTO order_rejections (order_id, reason, notes)
                VALUES ($1, $2, $3)
            `, [orderId, reason, notes || null]);

      // Restore stock for rejected order items (stock was reserved at order placement)
      const orderItems = await client.query(
        `SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
        [orderId]
      );

      for (const item of orderItems.rows) {
        await client.query(
          `UPDATE products SET available_quantity = available_quantity + $1, status = 'ACTIVE', updated_at = NOW() WHERE product_id = $2`,
          [item.quantity, item.product_id]
        );
      }

      await client.query('COMMIT');
      return orderRes.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async updateOrderStatus(farmerId: number, orderId: number, status: string) {
    const validStatuses = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(`
            UPDATE orders SET status = $3, updated_at = NOW()
            WHERE order_id = $1 AND farmer_id = $2
            RETURNING *
        `, [orderId, farmerId, status]);

      if (!res.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }

      // If order is cancelled, restore stock (stock was reserved at order placement)
      if (status === 'CANCELLED') {
        const orderItems = await client.query(
          `SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
          [orderId]
        );

        for (const item of orderItems.rows) {
          await client.query(
            `UPDATE products SET available_quantity = available_quantity + $1, status = 'ACTIVE', updated_at = NOW() WHERE product_id = $2`,
            [item.quantity, item.product_id]
          );
        }
      }

      await client.query('COMMIT');
      return res.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async markOrderNotCompleted(farmerId: number, orderId: number, reason: string, notes?: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update order status to CANCELLED
      const orderRes = await client.query(`
        UPDATE orders SET status = 'CANCELLED', updated_at = NOW()
        WHERE order_id = $1 AND farmer_id = $2 AND status IN ('CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY')
        RETURNING *
      `, [orderId, farmerId]);

      if (orderRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Record the reason in order_rejections table
      await client.query(`
        INSERT INTO order_rejections (order_id, reason, notes)
        VALUES ($1, $2, $3)
      `, [orderId, reason, notes || null]);

      // Restore stock for cancelled order items
      const orderItems = await client.query(
        `SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
        [orderId]
      );

      for (const item of orderItems.rows) {
        await client.query(
          `UPDATE products SET available_quantity = available_quantity + $1, status = 'ACTIVE', updated_at = NOW() WHERE product_id = $2`,
          [item.quantity, item.product_id]
        );
      }

      await client.query('COMMIT');
      return orderRes.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ===================== Farmer Ledger =====================
  async getLedger(farmerId: number) {
    console.log('getLedger called for farmerId:', farmerId);

    // Backfill: Create ledger entries for delivered orders that don't have them
    await this.pool.query(`
      INSERT INTO farmer_ledger (farmer_id, order_id, amount, transaction_type, balance_before, balance_after, description, created_at)
      SELECT o.farmer_id, o.order_id, o.total_amount, 'EARNING', 0, o.total_amount, 
             'Earnings from order #' || o.order_id, o.updated_at
      FROM orders o
      WHERE o.farmer_id = $1 AND o.status = 'DELIVERED'
        AND NOT EXISTS (SELECT 1 FROM farmer_ledger fl WHERE fl.order_id = o.order_id AND fl.transaction_type = 'EARNING')
    `, [farmerId]);

    const ledgerRes = await this.pool.query(`
            SELECT fl.*, o.order_id, o.total_amount as order_total
            FROM farmer_ledger fl
            LEFT JOIN orders o ON fl.order_id = o.order_id
            WHERE fl.farmer_id = $1
            ORDER BY fl.created_at DESC
        `, [farmerId]);
    console.log('Ledger entries found:', ledgerRes.rowCount);

    // Calculate current balance by summing all entries
    // EARNING is positive, others (PAYOUT, COMMISSION, REFUND, COD_FEE) are negative
    const balanceRes = await this.pool.query(`
            SELECT COALESCE(SUM(
              CASE WHEN transaction_type = 'EARNING' THEN amount ELSE -amount END
            ), 0) as current_balance
            FROM farmer_ledger
            WHERE farmer_id = $1
        `, [farmerId]);
    console.log('Current balance:', balanceRes.rows[0]?.current_balance);

    return {
      ledger: ledgerRes.rows,
      currentBalance: parseFloat(balanceRes.rows[0]?.current_balance || 0)
    };
  }

  // ===================== Farmer Payouts =====================
  async getPayouts(farmerId: number) {
    const res = await this.pool.query(`
            SELECT * FROM farmer_payouts
            WHERE farmer_id = $1
            ORDER BY created_at DESC
        `, [farmerId]);
    return res.rows;
  }

  async requestPayout(farmerId: number, amount: number, bankDetails: any) {
    // Get current balance from ledger
    const balanceRes = await this.pool.query(`
            SELECT COALESCE(
                (SELECT balance_after FROM farmer_ledger WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 1),
                0
            ) as current_balance
        `, [farmerId]);
    const currentBalance = parseFloat(balanceRes.rows[0]?.current_balance || 0);

    if (amount > currentBalance) {
      throw new Error('Insufficient balance for payout');
    }

    // Get commission rate
    const commissionRes = await this.pool.query(`
            SELECT commission_rate, min_commission FROM commission_settings ORDER BY setting_id DESC LIMIT 1
        `);
    const commissionRate = parseFloat(commissionRes.rows[0]?.commission_rate || 0.05);
    const minCommission = parseFloat(commissionRes.rows[0]?.min_commission || 0);

    const commissionAmount = Math.max(amount * commissionRate, minCommission);
    const netAmount = amount - commissionAmount;

    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const res = await this.pool.query(`
            INSERT INTO farmer_payouts (
                farmer_id, payout_period_start, payout_period_end,
                total_earnings, commission_amount, net_amount,
                status, bank_account_number, bank_name, branch_code
            ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, $9)
            RETURNING *
        `, [
      farmerId, periodStart, periodEnd,
      amount, commissionAmount, netAmount,
      bankDetails?.bank_account_number || null,
      bankDetails?.bank_name || null,
      bankDetails?.branch_code || null
    ]);

    return res.rows[0];
  }

  // ===================== Farmer Reviews =====================
  async getReviews(farmerId: number, limit = 50, offset = 0) {
    const res = await this.pool.query(`
            SELECT r.*, 
                   u.email as consumer_email,
                   p.full_name as consumer_name,
                   pr.variety_name as product_name
            FROM reviews r
            LEFT JOIN users u ON r.consumer_id = u.user_id
            LEFT JOIN profiles p ON r.consumer_id = p.user_id
            LEFT JOIN products pr ON r.product_id = pr.product_id
            WHERE r.farmer_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
        `, [farmerId, limit, offset]);
    return res.rows;
  }
}
