
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class AdminService {
  constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

  async listUsers(role?: string, status?: string) {
    const params: any[] = [];
    const where: string[] = [];

    if (role) {
      params.push(role.toUpperCase());
      where.push(`u.role = $${params.length}`);
    }

    if (status) {
      params.push(status.toUpperCase());
      where.push(`p.verification_status = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
      SELECT 
        u.user_id, u.email, u.phone, u.role, u.created_at,
        p.full_name, p.farm_name, p.verification_status
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.user_id
      ${whereSql}
      ORDER BY u.created_at DESC
    `;
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  async listPendingFarmers() {
    const result = await this.pool.query(`
      SELECT u.user_id, u.email, u.phone, p.full_name, p.farm_name, p.verification_status, p.updated_at
      FROM users u
      JOIN profiles p ON p.user_id = u.user_id
      WHERE u.role = 'FARMER' AND p.verification_status IN ('PENDING_REVIEW', 'PENDING_DOCUMENTS')
      ORDER BY p.updated_at DESC
    `);
    return result.rows;
  }

  // ===================== Verifications =====================
  async getVerificationApplication(userId: number) {
    const userRes = await this.pool.query(`
            SELECT u.user_id, u.email, u.phone, u.role, u.created_at,
                   p.full_name, p.farm_name, p.address, p.bank_account_number, p.bank_name, p.branch_code,
                   p.verification_status, p.verification_reason, p.latitude, p.longitude
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.user_id
            WHERE u.user_id = $1
        `, [userId]);

    if (userRes.rows.length === 0) return null;

    const row = userRes.rows[0];
    const docsRes = await this.pool.query(`
            SELECT id, doc_type, file_data, created_at FROM verification_documents WHERE user_id = $1
        `, [userId]);

    // Return with nested profile structure to match frontend expectations
    return {
      user_id: row.user_id,
      email: row.email,
      phone: row.phone,
      role: row.role,
      created_at: row.created_at,
      profile: {
        full_name: row.full_name,
        farm_name: row.farm_name,
        address: row.address,
        bank_account_number: row.bank_account_number,
        bank_name: row.bank_name,
        branch_code: row.branch_code,
        verification_status: row.verification_status,
        verification_reason: row.verification_reason,
        latitude: row.latitude,
        longitude: row.longitude,
      },
      documents: docsRes.rows
    };
  }

  async approveVerification(userId: number) {
    const res = await this.pool.query(`
            UPDATE profiles SET verification_status = 'APPROVED', verification_reason = NULL, updated_at = NOW()
            WHERE user_id = $1
            RETURNING user_id, verification_status
        `, [userId]);
    return res.rows[0] || null;
  }

  async rejectVerification(userId: number, reason: string) {
    const res = await this.pool.query(`
            UPDATE profiles SET verification_status = 'REJECTED', verification_reason = $2, updated_at = NOW()
            WHERE user_id = $1
            RETURNING user_id, verification_status, verification_reason
        `, [userId, reason]);
    return res.rows[0] || null;
  }

  // ===================== User Management =====================
  async getUserProfile(userId: number) {
    const res = await this.pool.query(`
            SELECT u.user_id, u.email, u.phone, u.role, u.created_at,
                   p.full_name, p.farm_name, p.address, p.verification_status,
                   (SELECT COUNT(*) FROM orders WHERE user_id = $1 OR farmer_id = $1) as order_count,
                   (SELECT COUNT(*) FROM products WHERE farmer_id = $1) as product_count
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.user_id
            WHERE u.user_id = $1
        `, [userId]);
    return res.rows[0] || null;
  }

  async suspendUser(userId: number, reason: string) {
    // Add a suspended status column if needed, or use verification_status
    const res = await this.pool.query(`
            UPDATE profiles SET verification_status = 'SUSPENDED', verification_reason = $2, updated_at = NOW()
            WHERE user_id = $1
            RETURNING user_id, verification_status
        `, [userId, reason]);
    return res.rows[0] || null;
  }

  async activateUser(userId: number) {
    const res = await this.pool.query(`
            UPDATE profiles SET verification_status = 'APPROVED', verification_reason = NULL, updated_at = NOW()
            WHERE user_id = $1
            RETURNING user_id, verification_status
        `, [userId]);
    return res.rows[0] || null;
  }

  // ===================== Order Monitoring =====================
  async getAllOrders(filters: any = {}) {
    const params: any[] = [];
    const where: string[] = [];
    let paramIdx = 1;

    if (filters.status) {
      where.push(`o.status = $${paramIdx++}`);
      params.push(filters.status);
    }
    if (filters.farmer_id) {
      where.push(`o.farmer_id = $${paramIdx++}`);
      params.push(parseInt(filters.farmer_id));
    }
    if (filters.user_id) {
      where.push(`o.user_id = $${paramIdx++}`);
      params.push(parseInt(filters.user_id));
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const res = await this.pool.query(`
            SELECT o.*,
                   cu.email as consumer_email, cp.full_name as consumer_name,
                   fu.email as farmer_email, fp.full_name as farmer_name, fp.farm_name
            FROM orders o
            LEFT JOIN users cu ON o.user_id = cu.user_id
            LEFT JOIN profiles cp ON o.user_id = cp.user_id
            LEFT JOIN users fu ON o.farmer_id = fu.user_id
            LEFT JOIN profiles fp ON o.farmer_id = fp.user_id
            ${whereSql}
            ORDER BY o.created_at DESC
        `, params);
    return res.rows;
  }

  async getOrderDetails(orderId: number) {
    const res = await this.pool.query(`
            SELECT o.*,
                   cu.email as consumer_email, cp.full_name as consumer_name,
                   fu.email as farmer_email, fp.full_name as farmer_name, fp.farm_name,
                   ca.full_address, ca.city, ca.state, ca.postal_code,
                   (SELECT json_agg(json_build_object(
                       'order_item_id', oi.order_item_id,
                       'product_id', oi.product_id,
                       'quantity', oi.quantity,
                       'unit_price', oi.unit_price,
                       'subtotal', oi.subtotal,
                       'variety_name', pr.variety_name
                   )) FROM order_items oi 
                   LEFT JOIN products pr ON oi.product_id = pr.product_id 
                   WHERE oi.order_id = o.order_id) as items
            FROM orders o
            LEFT JOIN users cu ON o.user_id = cu.user_id
            LEFT JOIN profiles cp ON o.user_id = cp.user_id
            LEFT JOIN users fu ON o.farmer_id = fu.user_id
            LEFT JOIN profiles fp ON o.farmer_id = fp.user_id
            LEFT JOIN consumer_addresses ca ON o.address_id = ca.address_id
            WHERE o.order_id = $1
        `, [orderId]);
    return res.rows[0] || null;
  }

  // ===================== Payout Management =====================
  async getAllPayouts(filters: any = {}) {
    const params: any[] = [];
    const where: string[] = [];
    let paramIdx = 1;

    if (filters.status) {
      where.push(`fp.status = $${paramIdx++}`);
      params.push(filters.status);
    }
    if (filters.farmer_id) {
      where.push(`fp.farmer_id = $${paramIdx++}`);
      params.push(parseInt(filters.farmer_id));
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const res = await this.pool.query(`
            SELECT fp.*, u.email as farmer_email, p.full_name as farmer_name, p.farm_name
            FROM farmer_payouts fp
            LEFT JOIN users u ON fp.farmer_id = u.user_id
            LEFT JOIN profiles p ON fp.farmer_id = p.user_id
            ${whereSql}
            ORDER BY fp.created_at DESC
        `, params);
    return res.rows;
  }

  async getPayoutDetails(payoutId: number) {
    const res = await this.pool.query(`
            SELECT fp.*, u.email as farmer_email, p.full_name as farmer_name, p.farm_name,
                   p.bank_account_number, p.bank_name, p.branch_code
            FROM farmer_payouts fp
            LEFT JOIN users u ON fp.farmer_id = u.user_id
            LEFT JOIN profiles p ON fp.farmer_id = p.user_id
            WHERE fp.payout_id = $1
        `, [payoutId]);
    return res.rows[0] || null;
  }

  async approvePayout(payoutId: number, transactionRef?: string, payoutDate?: string) {
    const res = await this.pool.query(`
            UPDATE farmer_payouts SET status = 'PROCESSING', 
                   transaction_reference = COALESCE($2, transaction_reference),
                   payout_date = COALESCE($3, payout_date),
                   updated_at = NOW()
            WHERE payout_id = $1 AND status = 'PENDING'
            RETURNING *
        `, [payoutId, transactionRef || null, payoutDate || null]);
    return res.rows[0] || null;
  }

  async completePayout(payoutId: number, transactionRef?: string, payoutDate?: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get payout details first
      const payoutRes = await client.query(`
            SELECT * FROM farmer_payouts
            WHERE payout_id = $1
        `, [payoutId]);

      if (payoutRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const payout = payoutRes.rows[0];

      // Create ledger entry for the payout (deduct from balance)
      // Get current balance before this payout
      const balanceRes = await client.query(`
            SELECT COALESCE(SUM(
              CASE WHEN transaction_type = 'EARNING' THEN amount ELSE -amount END
            ), 0) as current_balance
            FROM farmer_ledger
            WHERE farmer_id = $1
        `, [payout.farmer_id]);

      const balanceBefore = parseFloat(balanceRes.rows[0]?.current_balance || 0);
      const balanceAfter = balanceBefore - parseFloat(payout.net_amount);

      // Insert ledger entry for the payout
      await client.query(`
            INSERT INTO farmer_ledger (farmer_id, amount, transaction_type, balance_before, balance_after, description, created_at)
            VALUES ($1, $2, 'PAYOUT', $3, $4, $5, NOW())
        `, [
        payout.farmer_id,
        parseFloat(payout.net_amount),
        balanceBefore,
        balanceAfter,
        `Payout #${payoutId} completed`
      ]);

      // Update payout status
      const updateRes = await client.query(`
            UPDATE farmer_payouts SET status = 'COMPLETED', 
                   transaction_reference = COALESCE($2, transaction_reference),
                   payout_date = COALESCE($3, CURRENT_DATE),
                   updated_at = NOW()
            WHERE payout_id = $1 AND status IN ('PENDING', 'PROCESSING')
            RETURNING *
        `, [payoutId, transactionRef || null, payoutDate || null]);

      await client.query('COMMIT');
      return updateRes.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectPayout(payoutId: number, reason?: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get payout details first
      const payoutRes = await client.query(`
            SELECT * FROM farmer_payouts
            WHERE payout_id = $1
        `, [payoutId]);

      if (payoutRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const payout = payoutRes.rows[0];

      // Create ledger entry to reverse the payout (add back to balance)
      const balanceRes = await client.query(`
            SELECT COALESCE(SUM(
              CASE WHEN transaction_type = 'EARNING' THEN amount ELSE -amount END
            ), 0) as current_balance
            FROM farmer_ledger
            WHERE farmer_id = $1
        `, [payout.farmer_id]);

      const balanceBefore = parseFloat(balanceRes.rows[0]?.current_balance || 0);
      const balanceAfter = balanceBefore + parseFloat(payout.net_amount);

      // Insert ledger entry to reverse/restore the balance
      await client.query(`
            INSERT INTO farmer_ledger (farmer_id, amount, transaction_type, balance_before, balance_after, description, created_at)
            VALUES ($1, $2, 'PAYOUT_REVERSAL', $3, $4, $5, NOW())
        `, [
        payout.farmer_id,
        parseFloat(payout.net_amount),
        balanceBefore,
        balanceAfter,
        `Payout #${payoutId} rejected${reason ? `: ${reason}` : ''}`
      ]);

      // Update payout status
      const updateRes = await client.query(`
            UPDATE farmer_payouts SET status = 'FAILED', updated_at = NOW()
            WHERE payout_id = $1 AND status IN ('PENDING', 'PROCESSING')
            RETURNING *
        `, [payoutId]);

      await client.query('COMMIT');
      return updateRes.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ===================== Analytics =====================
  async getAnalytics(startDate?: string, endDate?: string) {
    // If no date range provided, query all-time data (no date filter)
    const useAllTime = !startDate && !endDate;
    const start = startDate || (useAllTime ? null : new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
    const end = endDate || (useAllTime ? null : new Date().toISOString().split('T')[0]);

    const dateFilter = useAllTime ? '' : 'AND created_at BETWEEN $1 AND $2';
    const dateParams = useAllTime ? [] : [start, end];

    const [ordersRes, usersRes, gmbRes, topProductsRes, topFarmersRes, userRegRes, completedOrdersRes] = await Promise.all([
      this.pool.query(`
                SELECT 
                    COUNT(*) as total_orders,
                    COUNT(*) FILTER (WHERE status = 'DELIVERED') as delivered_orders,
                    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_orders,
                    COUNT(*) FILTER (WHERE status = 'CANCELLED' OR status = 'REJECTED') as cancelled_orders,
                    COUNT(*) FILTER (WHERE status = 'DELIVERED') as completed_orders
                FROM orders ${useAllTime ? '' : 'WHERE created_at BETWEEN $1 AND $2'}
            `, dateParams),
      this.pool.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(*) FILTER (WHERE role = 'CONSUMER') as consumers,
                    COUNT(*) FILTER (WHERE role = 'FARMER') as farmers
                FROM users ${useAllTime ? '' : 'WHERE created_at BETWEEN $1 AND $2'}
            `, dateParams),
      // GMV (Gross Merchandise Value) = Total value of all delivered orders
      // Platform Revenue = Sum of all commission amounts from completed payouts
      this.pool.query(`
                SELECT 
                    COALESCE(SUM(total_amount), 0) as gmv,
                    (SELECT COALESCE(SUM(commission_amount), 0) 
                     FROM farmer_payouts 
                     WHERE status = 'COMPLETED' 
                     ${useAllTime ? '' : 'AND created_at BETWEEN $1 AND $2'}) as platform_revenue
                FROM orders 
                WHERE status = 'DELIVERED' 
                ${useAllTime ? '' : 'AND created_at BETWEEN $1 AND $2'}
            `, dateParams),
      // Top products by revenue
      this.pool.query(`
                SELECT 
                    pr.product_id,
                    pr.variety_name, 
                    pr.rice_type,
                    SUM(oi.quantity) as total_quantity_sold,
                    SUM(oi.subtotal) as total_revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products pr ON oi.product_id = pr.product_id
                WHERE o.status = 'DELIVERED' ${useAllTime ? '' : 'AND o.created_at BETWEEN $1 AND $2'}
                GROUP BY pr.product_id, pr.variety_name, pr.rice_type
                ORDER BY total_revenue DESC
                LIMIT 10
            `, dateParams),
      // Top farmers by revenue
      this.pool.query(`
                SELECT 
                    u.user_id as farmer_id,
                    p.full_name as farmer_name,
                    p.farm_name,
                    COUNT(o.order_id) as total_orders,
                    SUM(o.total_amount) as total_revenue
                FROM orders o
                JOIN users u ON o.farmer_id = u.user_id
                LEFT JOIN profiles p ON u.user_id = p.user_id
                WHERE o.status = 'DELIVERED' ${useAllTime ? '' : 'AND o.created_at BETWEEN $1 AND $2'}
                GROUP BY u.user_id, p.full_name, p.farm_name
                ORDER BY total_revenue DESC
                LIMIT 10
            `, dateParams),
      // User registrations by role
      this.pool.query(`
                SELECT role, COUNT(*) as count
                FROM users
                ${useAllTime ? '' : 'WHERE created_at BETWEEN $1 AND $2'}
                GROUP BY role
            `, dateParams),
      // Completed orders (for calculating average order value)
      this.pool.query(`
                SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
                FROM orders
                WHERE status = 'DELIVERED' ${useAllTime ? '' : 'AND created_at BETWEEN $1 AND $2'}
            `, dateParams)
    ]);

    const ordersData = ordersRes.rows[0];
    const gmbData = gmbRes.rows[0];
    const completedOrders = completedOrdersRes.rows[0];

    return {
      period: { start, end },
      orders: ordersData,
      users: usersRes.rows[0],
      gmv: parseFloat(gmbData.gmv || 0),
      platformRevenue: parseFloat(gmbData.platform_revenue || 0),
      revenue: parseFloat(gmbData.gmv || 0), // Keep for backward compatibility
      avgOrderValue: completedOrders.count > 0 ? parseFloat(completedOrders.total) / parseInt(completedOrders.count) : 0,
      top_products: topProductsRes.rows,
      popularProducts: topProductsRes.rows,
      topFarmers: topFarmersRes.rows,
      userRegistrations: userRegRes.rows
    };
  }

  // ===================== Commission Settings =====================
  async getCommissionSettings() {
    const res = await this.pool.query(`
            SELECT * FROM commission_settings ORDER BY setting_id DESC LIMIT 1
        `);
    return res.rows[0] || { commission_rate: 0.05, min_commission: 0 };
  }

  async updateCommissionSettings(rate: number, minCommission: number, updatedBy?: number) {
    // Check if settings exist
    const existing = await this.pool.query(`SELECT setting_id FROM commission_settings LIMIT 1`);

    if (existing.rows.length > 0) {
      const res = await this.pool.query(`
                UPDATE commission_settings SET commission_rate = $1, min_commission = $2, updated_by = $3, updated_at = NOW()
                WHERE setting_id = $4
                RETURNING *
            `, [rate, minCommission, updatedBy || null, existing.rows[0].setting_id]);
      return res.rows[0];
    } else {
      const res = await this.pool.query(`
                INSERT INTO commission_settings (commission_rate, min_commission, updated_by)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [rate, minCommission, updatedBy || null]);
      return res.rows[0];
    }
  }
}
