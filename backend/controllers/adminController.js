const pool = require('../config/database');
const Profile = require('../models/Profile');
const Verification = require('../models/Verification');

// List all users with optional role/status filters
exports.listUsers = async (req, res) => {
  try {
    const { role, status } = req.query; // status = profile.verification_status for farmers
    const params = [];
    let where = [];

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

    const result = await pool.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('listUsers error', error);
    res.status(500).json({ success: false, message: 'Failed to list users' });
  }
};

// List farmers with PENDING_REVIEW (or PENDING_DOCUMENTS if you want)
exports.listPendingFarmers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.email, u.phone, p.full_name, p.farm_name, p.verification_status, p.updated_at
      FROM users u
      JOIN profiles p ON p.user_id = u.user_id
      WHERE u.role = 'FARMER' AND p.verification_status IN ('PENDING_REVIEW', 'PENDING_DOCUMENTS')
      ORDER BY p.updated_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list farmers' });
  }
};

// Get farmer application details (profile + documents)
exports.getFarmerApplication = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await Profile.getByUserId(userId);
    const documents = await Verification.listDocuments(userId);
    res.json({ success: true, data: { profile, documents } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get application' });
  }
};

// Approve verification
exports.approveFarmer = async (req, res) => {
  try {
    const { userId } = req.params;
    await Profile.setVerificationStatus(userId, 'APPROVED');
    // TODO: send notification
    res.json({ success: true, message: 'Farmer approved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve' });
  }
};

// Reject verification with reason
exports.rejectFarmer = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Reason is required' });
    await Profile.setVerificationStatus(userId, 'REJECTED', reason);
    // TODO: send notification
    res.json({ success: true, message: 'Farmer rejected', data: { reason } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject' });
  }
};

// AD-1: Get user profile details
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const userQuery = await pool.query(
      `SELECT u.*, p.* FROM users u 
       LEFT JOIN profiles p ON u.user_id = p.user_id 
       WHERE u.user_id = $1`,
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const user = userQuery.rows[0];
    
    // Get additional data based on role
    if (user.role === 'FARMER') {
      // Get verification documents
      const Verification = require('../models/Verification');
      const documents = await Verification.listDocuments(userId);
      user.documents = documents;
    } else if (user.role === 'CONSUMER') {
      // Get consumer addresses and payment methods count
      const Consumer = require('../models/Consumer');
      const addresses = await Consumer.getAddresses(userId);
      const paymentMethods = await Consumer.getPaymentMethods(userId);
      user.addresses = addresses;
      user.payment_methods = paymentMethods;
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('getUserProfile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user profile' });
  }
};

// AD-1: Suspend user
exports.suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    // Add a suspended status or flag to users table
    // For now, we'll use a simple approach - add a is_suspended column if it doesn't exist
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'is_suspended'
        ) THEN
          ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);
    
    await pool.query(
      `UPDATE users SET is_suspended = TRUE WHERE user_id = $1`,
      [userId]
    );
    
    // TODO: Send notification to user
    
    res.json({ success: true, message: 'User suspended successfully' });
  } catch (error) {
    console.error('suspendUser error:', error);
    res.status(500).json({ success: false, message: 'Failed to suspend user' });
  }
};

// AD-1: Activate user (unsuspend)
exports.activateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await pool.query(
      `UPDATE users SET is_suspended = FALSE WHERE user_id = $1`,
      [userId]
    );
    
    // TODO: Send notification to user
    
    res.json({ success: true, message: 'User activated successfully' });
  } catch (error) {
    console.error('activateUser error:', error);
    res.status(500).json({ success: false, message: 'Failed to activate user' });
  }
};

// AD-2: Get all orders with filters
exports.getAllOrders = async (req, res) => {
  try {
    const { status, userId, farmerId, consumerId, startDate, endDate, orderId, q, limit = 50, offset = 0 } = req.query;
    
    const params = [];
    const where = [];
    let paramCount = 1;
    
    if (status) {
      params.push(status.toUpperCase());
      where.push(`o.status = $${paramCount++}`);
    }
    
    if (userId) {
      params.push(userId);
      where.push(`(o.farmer_id = $${paramCount++} OR o.consumer_id = $${paramCount})`);
      paramCount++;
    }
    
    if (farmerId) {
      params.push(farmerId);
      where.push(`o.farmer_id = $${paramCount++}`);
    }
    
    if (consumerId) {
      params.push(consumerId);
      where.push(`o.consumer_id = $${paramCount++}`);
    }
    
    if (orderId) {
      const isNumeric = /^\d+$/.test(String(orderId));
      if (isNumeric) {
        // Match strictly by numeric order_id
        params.push(parseInt(orderId));
        where.push(`o.order_id = $${paramCount++}`);
      } else {
        // Treat non-numeric as order number search
        params.push(`%${orderId}%`);
        // reuse same placeholder for all three fields
        where.push(`(o.order_number ILIKE $${paramCount} OR pr.farm_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
        paramCount++;
      }
    }

    // Generic text search (like consumer search style)
    if (q) {
      params.push(`%${q}%`);
      where.push(`(o.order_number ILIKE $${paramCount} OR pr.farm_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
      paramCount++;
    }
    
    if (startDate) {
      params.push(startDate);
      where.push(`o.created_at >= $${paramCount++}`);
    }
    
    if (endDate) {
      params.push(endDate);
      where.push(`o.created_at <= $${paramCount++}`);
    }
    
    params.push(parseInt(limit));
    params.push(parseInt(offset));
    
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        o.*,
        pr.farm_name,
        pr.full_name as farmer_name,
        u.email as consumer_email,
        (SELECT full_name FROM profiles WHERE user_id = o.consumer_id) as consumer_name
      FROM orders o
      LEFT JOIN profiles pr ON o.farmer_id = pr.user_id
      LEFT JOIN users u ON o.consumer_id = u.user_id
      ${whereSql}
      ORDER BY o.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      ${whereSql}
    `;
    const countResult = await pool.query(
      countQuery,
      params.slice(0, params.length - 2) // Remove limit and offset
    );
    
    res.json({ 
      success: true, 
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('getAllOrders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// AD-2: Get order details (admin view)
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const Order = require('../models/Order');
    
    // Get order without consumer_id restriction
    const orderQuery = await pool.query(
      `SELECT o.*, 
        pr.farm_name, pr.full_name as farmer_name,
        u.email as consumer_email,
        (SELECT full_name FROM profiles WHERE user_id = o.consumer_id) as consumer_name,
        ca.full_address as delivery_address
       FROM orders o
       LEFT JOIN profiles pr ON o.farmer_id = pr.user_id
       LEFT JOIN users u ON o.consumer_id = u.user_id
       LEFT JOIN consumer_addresses ca ON o.delivery_address_id = ca.address_id
       WHERE o.order_id = $1`,
      [orderId]
    );
    
    if (orderQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const order = orderQuery.rows[0];
    
    // Get order items
    const itemsQuery = await pool.query(
      `SELECT oi.*, p.variety_name, p.rice_type
       FROM order_items oi
       INNER JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    order.items = itemsQuery.rows;
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('getOrderDetails error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
};

// AD-3: Get all payment transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const { status, paymentMethod, startDate, endDate, limit = 50, offset = 0 } = req.query;
    
    const params = [];
    const where = [];
    let paramCount = 1;
    
    if (status) {
      params.push(status.toUpperCase());
      where.push(`pt.payment_status = $${paramCount++}`);
    }
    
    if (paymentMethod) {
      params.push(paymentMethod.toUpperCase());
      where.push(`pt.payment_method = $${paramCount++}`);
    }
    
    if (startDate) {
      params.push(startDate);
      where.push(`pt.created_at >= $${paramCount++}`);
    }
    
    if (endDate) {
      params.push(endDate);
      where.push(`pt.created_at <= $${paramCount++}`);
    }
    
    params.push(parseInt(limit));
    params.push(parseInt(offset));
    
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        pt.*,
        o.order_number,
        o.consumer_id,
        o.farmer_id,
        (SELECT email FROM users WHERE user_id = o.consumer_id) as consumer_email,
        (SELECT farm_name FROM profiles WHERE user_id = o.farmer_id) as farmer_name
      FROM payment_transactions pt
      INNER JOIN orders o ON pt.order_id = o.order_id
      ${whereSql}
      ORDER BY pt.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;
    
    const result = await pool.query(query, params);
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payment_transactions pt
      ${whereSql}
    `;
    const countResult = await pool.query(
      countQuery,
      params.slice(0, params.length - 2)
    );
    
    res.json({ 
      success: true, 
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('getAllTransactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

// AD-3: Process refund
exports.processRefund = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { reason } = req.body;
    
    const Payment = require('../models/Payment');
    
    // Get transaction
    const transactionResult = await pool.query(
      `SELECT * FROM payment_transactions WHERE transaction_id = $1`,
      [transactionId]
    );
    
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    const transaction = transactionResult.rows[0];
    
    if (transaction.payment_status !== 'COMPLETED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only completed transactions can be refunded' 
      });
    }
    
    // Update transaction status
    await pool.query(
      `UPDATE payment_transactions 
       SET payment_status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP 
       WHERE transaction_id = $1`,
      [transactionId]
    );
    
    // Update order status to cancelled
    await pool.query(
      `UPDATE orders SET status = 'CANCELLED' WHERE order_id = $1`,
      [transaction.order_id]
    );
    
    // TODO: Process actual refund through payment gateway
    // TODO: Send notification to consumer
    
    res.json({ success: true, message: 'Refund processed successfully' });
  } catch (error) {
    console.error('processRefund error:', error);
    res.status(500).json({ success: false, message: 'Failed to process refund' });
  }
};

// AD-3: Get all payouts
exports.getAllPayouts = async (req, res) => {
  try {
    const { status, farmerId, startDate, endDate, limit = 50, offset = 0 } = req.query;
    
    const params = [];
    const where = [];
    let paramCount = 1;
    
    if (status) {
      params.push(status.toUpperCase());
      where.push(`fp.status = $${paramCount++}`);
    }
    
    if (farmerId) {
      params.push(farmerId);
      where.push(`fp.farmer_id = $${paramCount++}`);
    }
    
    if (startDate) {
      params.push(startDate);
      where.push(`fp.created_at >= $${paramCount++}`);
    }
    
    if (endDate) {
      params.push(endDate);
      where.push(`fp.created_at <= $${paramCount++}`);
    }
    
    params.push(parseInt(limit));
    params.push(parseInt(offset));
    
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        fp.*,
        pr.farm_name,
        pr.full_name as farmer_name,
        u.email as farmer_email
      FROM farmer_payouts fp
      LEFT JOIN profiles pr ON fp.farmer_id = pr.user_id
      LEFT JOIN users u ON fp.farmer_id = u.user_id
      ${whereSql}
      ORDER BY fp.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getAllPayouts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payouts' });
  }
};

// AD-3: Get payout details
exports.getPayoutDetails = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const Payment = require('../models/Payment');
    
    const payout = await Payment.getPayoutById(payoutId);
    
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }
    
    res.json({ success: true, data: payout });
  } catch (error) {
    console.error('getPayoutDetails error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payout details' });
  }
};

// AD-3: Approve payout
exports.approvePayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { transactionReference, payoutDate } = req.body;
    const adminId = req.user.userId;
    
    const Payment = require('../models/Payment');
    const payout = await Payment.getPayoutById(payoutId);
    
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }
    
    if (payout.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: `Payout is already ${payout.status}` 
      });
    }
    
    // Update payout status to PROCESSING or COMPLETED
    const newStatus = 'PROCESSING'; // Admin approves, moves to processing
    const updatedPayout = await Payment.updatePayoutStatus(
      payoutId,
      newStatus,
      transactionReference || null,
      payoutDate || new Date().toISOString().split('T')[0]
    );
    
    // TODO: Send notification to farmer
    
    res.json({ 
      success: true, 
      message: 'Payout approved successfully',
      data: updatedPayout 
    });
  } catch (error) {
    console.error('approvePayout error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve payout' });
  }
};

// AD-3: Complete payout (mark as completed after transfer)
exports.completePayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { transactionReference, payoutDate } = req.body;
    
    const Payment = require('../models/Payment');
    const payout = await Payment.getPayoutById(payoutId);
    
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }
    
    if (payout.status !== 'PROCESSING') {
      return res.status(400).json({ 
        success: false, 
        message: `Payout must be PROCESSING to complete. Current status: ${payout.status}` 
      });
    }
    
    const updatedPayout = await Payment.updatePayoutStatus(
      payoutId,
      'COMPLETED',
      transactionReference || null,
      payoutDate || new Date().toISOString().split('T')[0]
    );
    
    // TODO: Send notification to farmer
    
    res.json({ 
      success: true, 
      message: 'Payout completed successfully',
      data: updatedPayout 
    });
  } catch (error) {
    console.error('completePayout error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete payout' });
  }
};

// AD-3: Reject payout
exports.rejectPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { reason } = req.body;
    
    const Payment = require('../models/Payment');
    const payout = await Payment.getPayoutById(payoutId);
    
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }
    
    if (payout.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot reject payout with status: ${payout.status}` 
      });
    }
    
    // Reverse the payout ledger entry (add back to balance)
    const PaymentModel = require('../models/Payment');
    await PaymentModel.addLedgerEntry(
      payout.farmer_id,
      null,
      'PAYOUT',
      parseFloat(payout.net_amount),
      `Payout #${payoutId} rejected${reason ? `: ${reason}` : ''}`
    );
    
    // Update payout status to FAILED (or we could use 'REJECTED' if we add it)
    const updatedPayout = await Payment.updatePayoutStatus(
      payoutId,
      'FAILED',
      null,
      null
    );
    
    // TODO: Send notification to farmer
    
    res.json({ 
      success: true, 
      message: 'Payout rejected successfully',
      data: updatedPayout 
    });
  } catch (error) {
    console.error('rejectPayout error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject payout' });
  }
};

// AD-3: Get/Update commission settings
exports.getCommissionSettings = async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const settings = await Payment.getCommissionRate();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('getCommissionSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch commission settings' });
  }
};

exports.updateCommissionSettings = async (req, res) => {
  try {
    const { rate, minCommission } = req.body;
    const adminId = req.user.userId;
    
    if (rate === undefined || rate < 0 || rate > 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Commission rate must be between 0 and 1 (e.g., 0.05 for 5%)' 
      });
    }
    
    const Payment = require('../models/Payment');
    const settings = await Payment.updateCommissionRate(
      parseFloat(rate),
      minCommission ? parseFloat(minCommission) : 0,
      adminId
    );
    
    res.json({ 
      success: true, 
      message: 'Commission settings updated successfully',
      data: settings 
    });
  } catch (error) {
    console.error('updateCommissionSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update commission settings' });
  }
};

// AD-6: Get analytics and KPIs
exports.getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = startDate && endDate 
      ? `WHERE o.created_at >= '${startDate}' AND o.created_at <= '${endDate}'`
      : '';
    
    // Total Sales Volume (GMV)
    const gmvQuery = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as gmv
      FROM orders
      ${dateFilter}
    `);
    
    // New User Registrations by Role
    const usersQuery = await pool.query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM users
      ${dateFilter.replace('o.created_at', 'created_at')}
      GROUP BY role
    `);
    
    // Total Orders
    const ordersQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders
      FROM orders
      ${dateFilter}
    `);
    
    // Most Popular Products
    const productsQuery = await pool.query(`
      SELECT 
        p.product_id,
        p.variety_name,
        p.rice_type,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.subtotal) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      INNER JOIN products p ON oi.product_id = p.product_id
      INNER JOIN orders o ON oi.order_id = o.order_id
      ${dateFilter}
      GROUP BY p.product_id, p.variety_name, p.rice_type
      ORDER BY total_revenue DESC
      LIMIT 10
    `);
    
    // Top Performing Farmers
    const farmersQuery = await pool.query(`
      SELECT 
        o.farmer_id,
        pr.farm_name,
        pr.full_name,
        COUNT(DISTINCT o.order_id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value
      FROM orders o
      INNER JOIN profiles pr ON o.farmer_id = pr.user_id
      ${dateFilter}
      GROUP BY o.farmer_id, pr.farm_name, pr.full_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `);
    
    // Platform Revenue (Commission)
    // Note: Commission amounts are stored as negative values in ledger (they reduce farmer balance)
    // So we need to negate the sum to get positive platform revenue
    const revenueQuery = await pool.query(`
      SELECT 
        COALESCE(ABS(SUM(
          CASE 
            WHEN fl.transaction_type = 'COMMISSION' THEN fl.amount
            ELSE 0
          END
        )), 0) as platform_revenue
      FROM farmer_ledger fl
      INNER JOIN orders o ON fl.order_id = o.order_id
      ${dateFilter}
    `);
    
    res.json({
      success: true,
      data: {
        gmv: parseFloat(gmvQuery.rows[0].gmv),
        userRegistrations: usersQuery.rows,
        orders: ordersQuery.rows[0],
        popularProducts: productsQuery.rows,
        topFarmers: farmersQuery.rows,
        platformRevenue: parseFloat(revenueQuery.rows[0].platform_revenue)
      }
    });
  } catch (error) {
    console.error('getAnalytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

// AD-4: Get all disputes
exports.getAllDisputes = async (req, res) => {
  try {
    const { status, disputeType, reportedBy, limit = 50, offset = 0 } = req.query;
    
    const Dispute = require('../models/Dispute');
    const disputes = await Dispute.getAllDisputes({
      status,
      disputeType,
      reportedBy,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({ success: true, data: disputes });
  } catch (error) {
    console.error('getAllDisputes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch disputes' });
  }
};

// AD-4: Get dispute details
exports.getDisputeDetails = async (req, res) => {
  try {
    const { disputeId } = req.params;
    
    const Dispute = require('../models/Dispute');
    const dispute = await Dispute.getDisputeById(disputeId);
    
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }
    
    res.json({ success: true, data: dispute });
  } catch (error) {
    console.error('getDisputeDetails error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dispute details' });
  }
};

// AD-4: Update dispute (resolve, add notes, etc.)
exports.updateDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { status, adminNotes, resolution } = req.body;
    const adminId = req.user.userId;
    
    const Dispute = require('../models/Dispute');
    const dispute = await Dispute.updateDispute(disputeId, {
      status,
      adminNotes,
      resolution,
      resolvedBy: adminId
    });
    
    // TODO: Send notification to involved parties
    
    res.json({ success: true, message: 'Dispute updated successfully', data: dispute });
  } catch (error) {
    console.error('updateDispute error:', error);
    res.status(500).json({ success: false, message: 'Failed to update dispute' });
  }
};

// AD-5: Get featured farmers
exports.getFeaturedFarmers = async (req, res) => {
  try {
    const HomepageContent = require('../models/HomepageContent');
    const farmers = await HomepageContent.getFeaturedFarmers(false);
    
    res.json({ success: true, data: farmers });
  } catch (error) {
    console.error('getFeaturedFarmers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch featured farmers' });
  }
};

// AD-5: Add featured farmer
exports.addFeaturedFarmer = async (req, res) => {
  try {
    const { farmerId, displayOrder } = req.body;
    
    if (!farmerId) {
      return res.status(400).json({ success: false, message: 'Farmer ID is required' });
    }
    
    const HomepageContent = require('../models/HomepageContent');
    const featured = await HomepageContent.addFeaturedFarmer(farmerId, displayOrder);
    
    res.json({ success: true, message: 'Farmer added to featured list', data: featured });
  } catch (error) {
    console.error('addFeaturedFarmer error:', error);
    res.status(500).json({ success: false, message: 'Failed to add featured farmer' });
  }
};

// AD-5: Remove featured farmer
exports.removeFeaturedFarmer = async (req, res) => {
  try {
    const { farmerId } = req.params;
    
    const HomepageContent = require('../models/HomepageContent');
    await HomepageContent.removeFeaturedFarmer(farmerId);
    
    res.json({ success: true, message: 'Farmer removed from featured list' });
  } catch (error) {
    console.error('removeFeaturedFarmer error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove featured farmer' });
  }
};

// AD-5: Get all promo codes
exports.getAllPromoCodes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM promo_codes ORDER BY created_at DESC`
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getAllPromoCodes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo codes' });
  }
};

// AD-5: Create promo code
exports.createPromoCode = async (req, res) => {
  try {
    const { code, description, discountType, discountValue, minOrderAmount, maxDiscountAmount, usageLimit, validFrom, validUntil, isActive } = req.body;
    
    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ 
        success: false, 
        message: 'Code, discount type, and discount value are required' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO promo_codes 
       (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, valid_from, valid_until, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [code, description || null, discountType, discountValue, minOrderAmount || 0, maxDiscountAmount || null, usageLimit || null, validFrom || null, validUntil || null, isActive !== false]
    );
    
    res.json({ success: true, message: 'Promo code created successfully', data: result.rows[0] });
  } catch (error) {
    console.error('createPromoCode error:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ success: false, message: 'Promo code already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create promo code' });
  }
};

// AD-5: Update promo code
exports.updatePromoCode = async (req, res) => {
  try {
    const { promoId } = req.params;
    const { description, discountType, discountValue, minOrderAmount, maxDiscountAmount, usageLimit, validFrom, validUntil, isActive } = req.body;
    
    const updates = [];
    const params = [];
    let paramCount = 1;
    
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }
    if (discountType !== undefined) {
      updates.push(`discount_type = $${paramCount++}`);
      params.push(discountType);
    }
    if (discountValue !== undefined) {
      updates.push(`discount_value = $${paramCount++}`);
      params.push(discountValue);
    }
    if (minOrderAmount !== undefined) {
      updates.push(`min_order_amount = $${paramCount++}`);
      params.push(minOrderAmount);
    }
    if (maxDiscountAmount !== undefined) {
      updates.push(`max_discount_amount = $${paramCount++}`);
      params.push(maxDiscountAmount);
    }
    if (usageLimit !== undefined) {
      updates.push(`usage_limit = $${paramCount++}`);
      params.push(usageLimit);
    }
    if (validFrom !== undefined) {
      updates.push(`valid_from = $${paramCount++}`);
      params.push(validFrom);
    }
    if (validUntil !== undefined) {
      updates.push(`valid_until = $${paramCount++}`);
      params.push(validUntil);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      params.push(isActive);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    params.push(promoId);
    
    const result = await pool.query(
      `UPDATE promo_codes 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE promo_id = $${paramCount}
       RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }
    
    res.json({ success: true, message: 'Promo code updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('updatePromoCode error:', error);
    res.status(500).json({ success: false, message: 'Failed to update promo code' });
  }
};

// AD-5: Delete promo code
exports.deletePromoCode = async (req, res) => {
  try {
    const { promoId } = req.params;
    
    const result = await pool.query(
      `DELETE FROM promo_codes WHERE promo_id = $1 RETURNING *`,
      [promoId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }
    
    res.json({ success: true, message: 'Promo code deleted successfully' });
  } catch (error) {
    console.error('deletePromoCode error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete promo code' });
  }
};


