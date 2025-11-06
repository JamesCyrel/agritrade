const supabase = require('../config/supabase');

class Notification {
  static async createTable() {
    console.log('ℹ️  Skipping runtime notification table creation. Manage schema in Supabase.');
  }

  static async createNotification(userId, type, title, message, orderId = null) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{ user_id: userId, order_id: orderId || null, type, title, message }])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async getUserNotifications(userId, limit = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(0, Math.max(0, limit - 1));
    if (error) throw error;
    return data || [];
  }

  static async markAsRead(notificationId, userId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('notification_id', notificationId)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
  }

  static async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('notification_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return count || 0;
  }

  static async getDeliveryFeeSettings() {
    const { data, error } = await supabase
      .from('delivery_fee_settings')
      .select('*')
      .order('setting_id', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (data && data[0]) || { base_fee: 50, price_per_km: 5, min_fee: 20, max_fee: 500 };
  }

  static async updateDeliveryFeeSettings(settings, updatedBy) {
    const { base_fee, price_per_km, min_fee, max_fee } = settings;

    const { data: existing } = await supabase
      .from('delivery_fee_settings')
      .select('setting_id')
      .limit(1);

    if (!existing || existing.length === 0) {
      const { error } = await supabase
        .from('delivery_fee_settings')
        .insert([{ base_fee, price_per_km, min_fee: min_fee || null, max_fee: max_fee || null, updated_by: updatedBy }]);
      if (error) throw error;
    } else {
      const id = existing[0].setting_id;
      const { error } = await supabase
        .from('delivery_fee_settings')
        .update({ base_fee, price_per_km, min_fee: min_fee || null, max_fee: max_fee || null, updated_by: updatedBy })
        .eq('setting_id', id);
      if (error) throw error;
    }

    return await this.getDeliveryFeeSettings();
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static async calculateDeliveryFee(farmerLat, farmerLng, consumerLat, consumerLng) {
    const settings = await this.getDeliveryFeeSettings();
    if (!farmerLat || !farmerLng || !consumerLat || !consumerLng) return parseFloat(settings.base_fee);

    const distance = this.calculateDistance(
      parseFloat(farmerLat),
      parseFloat(farmerLng),
      parseFloat(consumerLat),
      parseFloat(consumerLng)
    );

    let fee = parseFloat(settings.base_fee) + (distance * parseFloat(settings.price_per_km));
    if (settings.min_fee && fee < parseFloat(settings.min_fee)) fee = parseFloat(settings.min_fee);
    if (settings.max_fee && fee > parseFloat(settings.max_fee)) fee = parseFloat(settings.max_fee);
    return Math.round(fee * 100) / 100;
  }
}

module.exports = Notification;

