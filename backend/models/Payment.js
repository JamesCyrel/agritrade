const supabase = require('../config/supabase');

class Payment {
  static async createTable() {
    console.log('ℹ️  Skipping runtime payment table creation. Manage schema in Supabase.');
  }

  static async createTransaction(orderId, paymentMethod, amount, gatewayTransactionId = null, gatewayResponse = null) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert([
        {
          order_id: orderId,
          payment_method: paymentMethod,
          amount: parseFloat(amount),
          gateway_transaction_id: gatewayTransactionId || null,
          gateway_response: gatewayResponse || null,
          payment_status: paymentMethod === 'COD' ? 'PENDING' : 'PROCESSING',
        },
      ])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async updateTransactionStatus(transactionId, status, gatewayResponse = null) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .update({ payment_status: status, gateway_response: gatewayResponse || null })
      .eq('transaction_id', transactionId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async getTransactionByOrderId(orderId) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('order_id', orderId)
      .limit(1);
    if (error) throw error;
    return (data && data[0]) || null;
  }

  static async hasEarningForOrder(farmerId, orderId) {
    const { count, error } = await supabase
      .from('farmer_ledger')
      .select('ledger_id', { count: 'exact', head: true })
      .eq('farmer_id', farmerId)
      .eq('order_id', orderId)
      .eq('transaction_type', 'EARNING');
    if (error) throw error;
    return (count || 0) > 0;
  }

  static async addLedgerEntry(farmerId, orderId, transactionType, amount, description = null) {
    const balanceBefore = await this.getFarmerBalance(farmerId);
    const balanceAfter = balanceBefore + parseFloat(amount);

    const { data, error } = await supabase
      .from('farmer_ledger')
      .insert([
        {
          farmer_id: farmerId,
          order_id: orderId || null,
          transaction_type: transactionType,
          amount: parseFloat(amount),
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: description || null,
        },
      ])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async getFarmerBalance(farmerId) {
    const { data, error } = await supabase
      .from('farmer_ledger')
      .select('balance_after, created_at')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data && data.length > 0 ? parseFloat(data[0].balance_after) : 0;
  }

  static async getFarmerLedger(farmerId, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('farmer_ledger')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  }

  static async createPayout(farmerId, periodStart, periodEnd, totalEarnings, commissionAmount, bankDetails) {
    const netAmount = totalEarnings - commissionAmount;
    const { data, error } = await supabase
      .from('farmer_payouts')
      .insert([
        {
          farmer_id: farmerId,
          payout_period_start: periodStart,
          payout_period_end: periodEnd,
          total_earnings: totalEarnings,
          commission_amount: commissionAmount,
          net_amount: netAmount,
          bank_account_number: bankDetails.account_number,
          bank_name: bankDetails.bank_name,
          branch_code: bankDetails.branch_code,
        },
      ])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async updatePayoutStatus(payoutId, status, transactionReference = null, payoutDate = null) {
    const { data, error } = await supabase
      .from('farmer_payouts')
      .update({ status, transaction_reference: transactionReference || null, payout_date: payoutDate || null })
      .eq('payout_id', payoutId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async getFarmerPayouts(farmerId, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('farmer_payouts')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  }

  static async getCODSettings(farmerId) {
    const { data, error } = await supabase
      .from('cod_settings')
      .select('*')
      .eq('farmer_id', farmerId)
      .limit(1);
    if (error) throw error;
    return (data && data[0]) || null;
  }

  static async updateCODSettings(farmerId, settings) {
    const payload = {
      farmer_id: farmerId,
      is_enabled: settings.is_enabled !== undefined ? settings.is_enabled : true,
      min_order_amount: settings.min_order_amount || 0,
      max_order_amount: settings.max_order_amount || null,
      allowed_areas: settings.allowed_areas || null,
    };

    const { data, error } = await supabase
      .from('cod_settings')
      .upsert(payload, { onConflict: 'farmer_id' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async checkCODEligibility(userId, orderAmount, farmerId = null) {
    const { data: elig } = await supabase
      .from('cod_eligibility')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (elig && elig.length > 0) {
      const e = elig[0];
      if (!e.is_eligible) return { eligible: false, reason: e.reason || 'User not eligible for COD' };
      if (e.max_order_value && parseFloat(orderAmount) > parseFloat(e.max_order_value)) {
        return { eligible: false, reason: `Order amount exceeds COD limit of ₱${e.max_order_value}` };
      }
    }

    if (farmerId) {
      const settings = await this.getCODSettings(farmerId);
      if (settings && !settings.is_enabled) return { eligible: false, reason: 'Farmer does not accept COD' };
      if (settings) {
        if (settings.min_order_amount && parseFloat(orderAmount) < parseFloat(settings.min_order_amount)) {
          return { eligible: false, reason: `Order amount must be at least ₱${settings.min_order_amount} for COD` };
        }
        if (settings.max_order_amount && parseFloat(orderAmount) > parseFloat(settings.max_order_amount)) {
          return { eligible: false, reason: `Order amount exceeds COD limit of ₱${settings.max_order_amount}` };
        }
      }
    }

    return { eligible: true };
  }

  static async updateCODEligibility(userId, eligibility) {
    const payload = {
      user_id: userId,
      is_eligible: eligibility.is_eligible !== undefined ? eligibility.is_eligible : true,
      reason: eligibility.reason || null,
      max_order_value: eligibility.max_order_value || null,
      restrictions: eligibility.restrictions || null,
    };

    const { data, error } = await supabase
      .from('cod_eligibility')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async getCommissionRate() {
    const { data, error } = await supabase
      .from('commission_settings')
      .select('commission_rate, min_commission')
      .order('setting_id', { ascending: true })
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return { rate: 0.05, minCommission: 0 };
    return { rate: parseFloat(data[0].commission_rate) || 0.05, minCommission: parseFloat(data[0].min_commission) || 0 };
  }

  static async updateCommissionRate(rate, minCommission = 0, updatedBy = null) {
    // Try update first
    const { data, error } = await supabase
      .from('commission_settings')
      .update({ commission_rate: rate, min_commission: minCommission, updated_by: updatedBy })
      .eq('setting_id', 1)
      .select('*');
    if (error) throw error;

    if (!data || data.length === 0) {
      const { data: inserted, error: insErr } = await supabase
        .from('commission_settings')
        .insert([{ setting_id: 1, commission_rate: rate, min_commission: minCommission, updated_by: updatedBy }])
        .select('*');
      if (insErr) throw insErr;
      return inserted && inserted[0];
    }

    return data[0];
  }

  static async requestPayout(farmerId, amount, bankDetails) {
    const currentBalance = await this.getFarmerBalance(farmerId);
    if (parseFloat(amount) > currentBalance) throw new Error('Requested amount exceeds available balance');
    if (parseFloat(amount) <= 0) throw new Error('Payout amount must be greater than 0');

    // Check existing pending
    const { data: pending } = await supabase
      .from('farmer_payouts')
      .select('payout_id')
      .eq('farmer_id', farmerId)
      .eq('status', 'PENDING')
      .limit(1);
    if (pending && pending.length > 0) throw new Error('You already have a pending payout request');

    const { data, error } = await supabase
      .from('farmer_payouts')
      .insert([
        {
          farmer_id: farmerId,
          payout_period_start: new Date().toISOString().slice(0, 10),
          payout_period_end: new Date().toISOString().slice(0, 10),
          total_earnings: parseFloat(amount),
          commission_amount: 0,
          net_amount: parseFloat(amount),
          bank_account_number: bankDetails.account_number,
          bank_name: bankDetails.bank_name,
          branch_code: bankDetails.branch_code,
          status: 'PENDING',
        },
      ])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async getPayoutById(payoutId) {
    const { data, error } = await supabase
      .from('farmer_payouts')
      .select('*, farmer_id')
      .eq('payout_id', payoutId)
      .single();
    if (error) throw error;

    const { data: pr } = await supabase
      .from('profiles')
      .select('farm_name, full_name')
      .eq('user_id', data.farmer_id)
      .single();
    const { data: u } = await supabase
      .from('users')
      .select('email')
      .eq('user_id', data.farmer_id)
      .single();

    return {
      ...data,
      farm_name: pr?.farm_name,
      farmer_name: pr?.full_name,
      farmer_email: u?.email,
    };
  }
}

module.exports = Payment;

