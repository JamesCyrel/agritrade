const pool = require('../config/database');

class Profile {
  static async upsertFarmerProfile(userId, {
    full_name,
    farm_name,
    address,
    bank_account_number,
    bank_name,
    branch_code,
    latitude,
    longitude,
  }) {
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
    const res = await pool.query(query, params);
    return res.rows[0];
  }

  static async getByUserId(userId) {
    const res = await pool.query(
      `SELECT profile_id, user_id, full_name, farm_name, address, bank_account_number, bank_name, branch_code, verification_status, latitude, longitude
       FROM profiles WHERE user_id=$1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  static async setVerificationStatus(userId, status, reason = null) {
    const res = await pool.query(
      `UPDATE profiles SET verification_status=$2, updated_at=NOW(), verification_reason=$3 WHERE user_id=$1 RETURNING verification_status`,
      [userId, status, reason]
    );
    return res.rows[0];
  }
}

module.exports = Profile;


