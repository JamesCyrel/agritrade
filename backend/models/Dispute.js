const supabase = require('../config/supabase');

class Dispute {
  // Create disputes table (AD-4)
  static async createTable() {
    // Schema migrations are managed via Supabase. No-op here.
    console.log('ℹ️  Dispute.createTable skipped (managed in Supabase)');
  }

  // Create a dispute ticket
  static async createDispute(disputeData) {
    const { orderId, reportedBy, reportedAgainst, disputeType, subject, description } = disputeData;
    
    const { data, error } = await supabase
      .from('disputes')
      .insert([
        {
          order_id: orderId || null,
          reported_by: reportedBy,
          reported_against: reportedAgainst || null,
          dispute_type: disputeType,
          subject,
          description,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
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

    // Fetch base disputes
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Apply in-memory filters not captured in base query
    let filtered = data;
    if (status) filtered = filtered.filter((d) => d.status === status);
    if (disputeType) filtered = filtered.filter((d) => d.dispute_type === disputeType);
    if (reportedBy) filtered = filtered.filter((d) => d.reported_by === reportedBy);

    // Enrich with related fields
    const enriched = await Promise.all(
      filtered.map(async (d) => {
        const [{ data: order }, { data: reporter }, { data: against }, { data: resolver }] = await Promise.all([
          supabase.from('orders').select('order_number').eq('order_id', d.order_id).maybeSingle(),
          supabase.from('users').select('email').eq('user_id', d.reported_by).maybeSingle(),
          d.reported_against
            ? supabase.from('users').select('email').eq('user_id', d.reported_against).maybeSingle()
            : Promise.resolve({ data: null }),
          d.resolved_by
            ? supabase.from('users').select('email').eq('user_id', d.resolved_by).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        const [{ data: reporterProfile }, { data: againstProfile }] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('user_id', d.reported_by).maybeSingle(),
          d.reported_against
            ? supabase.from('profiles').select('full_name').eq('user_id', d.reported_against).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        return {
          ...d,
          order_number: order?.order_number || null,
          reported_by_email: reporter?.email || null,
          reported_by_name: reporterProfile?.full_name || null,
          reported_against_email: against?.email || null,
          reported_against_name: againstProfile?.full_name || null,
          resolved_by_email: resolver?.email || null,
        };
      })
    );

    return enriched;
  }

  // Get dispute by ID
  static async getDisputeById(disputeId) {
    const { data: d, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('dispute_id', disputeId)
      .single();
    if (error) throw error;

    const [{ data: order }, { data: reporter }, { data: against }, { data: resolver }] = await Promise.all([
      supabase.from('orders').select('order_number').eq('order_id', d.order_id).maybeSingle(),
      supabase.from('users').select('email').eq('user_id', d.reported_by).maybeSingle(),
      d.reported_against
        ? supabase.from('users').select('email').eq('user_id', d.reported_against).maybeSingle()
        : Promise.resolve({ data: null }),
      d.resolved_by
        ? supabase.from('users').select('email').eq('user_id', d.resolved_by).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const [{ data: reporterProfile }, { data: againstProfile }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('user_id', d.reported_by).maybeSingle(),
      d.reported_against
        ? supabase.from('profiles').select('full_name').eq('user_id', d.reported_against).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      ...d,
      order_number: order?.order_number || null,
      reported_by_email: reporter?.email || null,
      reported_by_name: reporterProfile?.full_name || null,
      reported_against_email: against?.email || null,
      reported_against_name: againstProfile?.full_name || null,
      resolved_by_email: resolver?.email || null,
    };
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

    const updatePayload = {};
    if (status !== undefined) updatePayload.status = status;
    if (adminNotes !== undefined) updatePayload.admin_notes = adminNotes;
    if (resolution !== undefined) updatePayload.resolution = resolution;
    if (resolvedBy !== undefined) {
      updatePayload.resolved_by = resolvedBy;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updatePayload.resolved_at = new Date().toISOString();
      }
    }

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('disputes')
      .update(updatePayload)
      .eq('dispute_id', disputeId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

module.exports = Dispute;

