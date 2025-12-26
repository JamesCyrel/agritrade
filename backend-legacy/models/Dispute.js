const pool = require('../config/database');

class Dispute {
  // Create disputes table (AD-4)
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS disputes (
        dispute_id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
        reported_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        reported_against INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        dispute_type VARCHAR(50) NOT NULL CHECK (dispute_type IN ('PRODUCT_QUALITY', 'DELIVERY_ISSUE', 'PAYMENT', 'OTHER')),
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
        admin_notes TEXT,
        resolution TEXT,
        resolved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
      CREATE INDEX IF NOT EXISTS idx_disputes_reported_by ON disputes(reported_by);
      CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
    `;

    try {
      await pool.query(query);
      console.log('✅ Dispute tables created/verified');
    } catch (error) {
      console.error('❌ Error creating dispute tables:', error);
      throw error;
    }
  }

  // Create a dispute ticket
  static async createDispute(disputeData) {
    const { orderId, reportedBy, reportedAgainst, disputeType, subject, description } = disputeData;
    
    const result = await pool.query(
      `INSERT INTO disputes (order_id, reported_by, reported_against, dispute_type, subject, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orderId || null, reportedBy, reportedAgainst || null, disputeType, subject, description]
    );
    
    return result.rows[0];
  }

  // Get all disputes with filters
  static async getAllDisputes(filters = {}) {
    const { status, disputeType, reportedBy, limit = 50, offset = 0 } = filters;
    const params = [];
    const where = [];
    let paramCount = 1;

    if (status) {
      params.push(status);
      where.push(`d.status = $${paramCount++}`);
    }

    if (disputeType) {
      params.push(disputeType);
      where.push(`d.dispute_type = $${paramCount++}`);
    }

    if (reportedBy) {
      params.push(reportedBy);
      where.push(`d.reported_by = $${paramCount++}`);
    }

    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT 
        d.*,
        o.order_number,
        u1.email as reported_by_email,
        (SELECT full_name FROM profiles WHERE user_id = d.reported_by) as reported_by_name,
        u2.email as reported_against_email,
        (SELECT full_name FROM profiles WHERE user_id = d.reported_against) as reported_against_name,
        u3.email as resolved_by_email
      FROM disputes d
      LEFT JOIN orders o ON d.order_id = o.order_id
      LEFT JOIN users u1 ON d.reported_by = u1.user_id
      LEFT JOIN users u2 ON d.reported_against = u2.user_id
      LEFT JOIN users u3 ON d.resolved_by = u3.user_id
      ${whereSql}
      ORDER BY d.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get dispute by ID
  static async getDisputeById(disputeId) {
    const result = await pool.query(
      `SELECT 
        d.*,
        o.order_number,
        u1.email as reported_by_email,
        (SELECT full_name FROM profiles WHERE user_id = d.reported_by) as reported_by_name,
        u2.email as reported_against_email,
        (SELECT full_name FROM profiles WHERE user_id = d.reported_against) as reported_against_name,
        u3.email as resolved_by_email
      FROM disputes d
      LEFT JOIN orders o ON d.order_id = o.order_id
      LEFT JOIN users u1 ON d.reported_by = u1.user_id
      LEFT JOIN users u2 ON d.reported_against = d.reported_against
      LEFT JOIN users u3 ON d.resolved_by = u3.user_id
      WHERE d.dispute_id = $1`,
      [disputeId]
    );
    
    return result.rows[0] || null;
  }

  // Update dispute status and add admin notes
  static async updateDispute(disputeId, updateData) {
    const { status, adminNotes, resolution, resolvedBy } = updateData;
    
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }

    if (adminNotes !== undefined) {
      updates.push(`admin_notes = $${paramCount++}`);
      params.push(adminNotes);
    }

    if (resolution !== undefined) {
      updates.push(`resolution = $${paramCount++}`);
      params.push(resolution);
    }

    if (resolvedBy !== undefined) {
      updates.push(`resolved_by = $${paramCount++}`);
      params.push(resolvedBy);
      
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updates.push(`resolved_at = CURRENT_TIMESTAMP`);
      }
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(disputeId);

    const query = `
      UPDATE disputes
      SET ${updates.join(', ')}
      WHERE dispute_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    return result.rows[0];
  }
}

module.exports = Dispute;

