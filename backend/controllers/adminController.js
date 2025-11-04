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


