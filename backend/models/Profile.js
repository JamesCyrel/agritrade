const supabase = require('../config/supabase');

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
    const payload = {
      user_id: userId,
      full_name: full_name || null,
      farm_name: farm_name || null,
      address: address || null,
      bank_account_number: bank_account_number || null,
      bank_name: bank_name || null,
      branch_code: branch_code || null,
      latitude: latitude || null,
      longitude: longitude || null,
    };

    // Preserve existing verification_status or default to NOT_SUBMITTED
    const { data: existing } = await supabase
      .from('profiles')
      .select('verification_status')
      .eq('user_id', userId)
      .limit(1);
    if (!payload.verification_status) {
      payload.verification_status = existing && existing[0]?.verification_status || 'NOT_SUBMITTED';
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('profile_id, user_id, full_name, farm_name, address, bank_account_number, bank_name, branch_code, verification_status, latitude, longitude')
      .single();
    if (error) throw error;
    return data;
  }

  static async getByUserId(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('profile_id, user_id, full_name, farm_name, address, bank_account_number, bank_name, branch_code, verification_status, latitude, longitude')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  static async setVerificationStatus(userId, status, reason = null) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ verification_status: status, verification_reason: reason || null })
      .eq('user_id', userId)
      .select('verification_status')
      .single();
    if (error) throw error;
    return data;
  }
}

module.exports = Profile;


