
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

    const docsRes = await this.pool.query(`
            SELECT id, doc_type, file_data, created_at FROM verification_documents WHERE user_id = $1
        `, [userId]);

    return {
      ...userRes.rows[0],
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
    const res = await this.pool.query(`
            UPDATE farmer_payouts SET status = 'COMPLETED', 
                   transaction_reference = COALESCE($2, transaction_reference),
                   payout_date = COALESCE($3, CURRENT_DATE),
                   updated_at = NOW()
            WHERE payout_id = $1 AND status IN ('PENDING', 'PROCESSING')
            RETURNING *
        `, [payoutId, transactionRef || null, payoutDate || null]);
    return res.rows[0] || null;
  }

  async rejectPayout(payoutId: number, reason?: string) {
    const res = await this.pool.query(`
            UPDATE farmer_payouts SET status = 'FAILED', updated_at = NOW()
            WHERE payout_id = $1 AND status IN ('PENDING', 'PROCESSING')
            RETURNING *
        `, [payoutId]);
    return res.rows[0] || null;
  }

  // ===================== Analytics =====================
  async getAnalytics(startDate?: string, endDate?: string) {
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const [ordersRes, usersRes, revenueRes, topProductsRes] = await Promise.all([
      this.pool.query(`
                SELECT 
                    COUNT(*) as total_orders,
                    COUNT(*) FILTER (WHERE status = 'DELIVERED') as delivered_orders,
                    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_orders,
                    COUNT(*) FILTER (WHERE status = 'CANCELLED' OR status = 'REJECTED') as cancelled_orders
                FROM orders WHERE created_at BETWEEN $1 AND $2
            `, [start, end]),
      this.pool.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(*) FILTER (WHERE role = 'CONSUMER') as consumers,
                    COUNT(*) FILTER (WHERE role = 'FARMER') as farmers
                FROM users WHERE created_at BETWEEN $1 AND $2
            `, [start, end]),
      this.pool.query(`
                SELECT COALESCE(SUM(total_amount), 0) as total_revenue
                FROM orders WHERE status = 'DELIVERED' AND created_at BETWEEN $1 AND $2
            `, [start, end]),
      this.pool.query(`
                SELECT pr.variety_name, SUM(oi.quantity) as total_sold
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products pr ON oi.product_id = pr.product_id
                WHERE o.status = 'DELIVERED' AND o.created_at BETWEEN $1 AND $2
                GROUP BY pr.variety_name
                ORDER BY total_sold DESC
                LIMIT 10
            `, [start, end])
    ]);

    return {
      period: { start, end },
      orders: ordersRes.rows[0],
      users: usersRes.rows[0],
      revenue: revenueRes.rows[0],
      top_products: topProductsRes.rows
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
