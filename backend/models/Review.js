const supabase = require('../config/supabase');

class Review {
  static async createTable() {
    console.log('ℹ️  Skipping runtime review table creation. Manage schema in Supabase.');
  }

  static async createReview(reviewData) {
    const { orderId, consumerId, farmerId, productId, rating, comment } = reviewData;

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('status, consumer_id')
      .eq('order_id', orderId)
      .single();
    if (orderErr || !order) throw new Error('Order not found');
    if (order.status !== 'DELIVERED') throw new Error('Can only review completed orders');
    if (order.consumer_id !== parseInt(consumerId)) throw new Error('Order does not belong to this consumer');

    const { count, error: existErr } = await supabase
      .from('reviews')
      .select('review_id', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('consumer_id', consumerId);
    if (existErr) throw existErr;
    if ((count || 0) > 0) throw new Error('Review already exists for this order');

    const { data, error } = await supabase
      .from('reviews')
      .insert([{ order_id: orderId, consumer_id: consumerId, farmer_id: farmerId, product_id: productId || null, rating, comment: comment || null }])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async updateReview(reviewId, consumerId, rating, comment) {
    const { data, error } = await supabase
      .from('reviews')
      .update({ rating, comment: comment || null })
      .eq('review_id', reviewId)
      .eq('consumer_id', consumerId)
      .select('*')
      .single();
    if (error || !data) throw new Error('Review not found or not yours');
    return data;
  }

  static async getFarmerAverageRating(farmerId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('farmer_id', farmerId);
    if (error) throw error;
    const ratings = (data || []).map(r => r.rating);
    const average = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    const counts = {
      five_star: ratings.filter(r => r === 5).length,
      four_star: ratings.filter(r => r === 4).length,
      three_star: ratings.filter(r => r === 3).length,
      two_star: ratings.filter(r => r === 2).length,
      one_star: ratings.filter(r => r === 1).length,
    };
    return { average_rating: average, total_reviews: ratings.length, ...counts };
  }

  static async getFarmerReviews(farmerId, limit = 20, offset = 0) {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const consumerIds = Array.from(new Set((reviews || []).map(r => r.consumer_id)));
    const orderIds = Array.from(new Set((reviews || []).map(r => r.order_id)));
    const productIds = Array.from(new Set((reviews || []).map(r => r.product_id).filter(Boolean)));

    const { data: users } = await supabase.from('users').select('user_id, email').in('user_id', consumerIds);
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', consumerIds);
    const { data: orders } = await supabase.from('orders').select('order_id, order_number').in('order_id', orderIds);
    const { data: products } = await supabase.from('products').select('product_id, variety_name').in('product_id', productIds);

    const userMap = new Map((users || []).map(u => [u.user_id, u]));
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const orderMap = new Map((orders || []).map(o => [o.order_id, o]));
    const productMap = new Map((products || []).map(p => [p.product_id, p]));

    return (reviews || []).map(r => ({
      ...r,
      consumer_email: userMap.get(r.consumer_id)?.email,
      consumer_name: profileMap.get(r.consumer_id)?.full_name,
      order_number: orderMap.get(r.order_id)?.order_number,
      product_name: r.product_id ? productMap.get(r.product_id)?.variety_name : null,
    }));
  }

  static async getFarmerReviewsForDashboard(farmerId, limit = 50, offset = 0) {
    // Same as public but includes order_date
    const list = await this.getFarmerReviews(farmerId, limit, offset);
    // Attach order date
    const orderIds = Array.from(new Set(list.map(r => r.order_id)));
    const { data: orders } = await supabase.from('orders').select('order_id, created_at').in('order_id', orderIds);
    const orderDateMap = new Map((orders || []).map(o => [o.order_id, o.created_at]));
    return list.map(r => ({ ...r, order_date: orderDateMap.get(r.order_id) || null }));
  }

  static async getProductReviews(productId, limit = 20, offset = 0) {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const consumerIds = Array.from(new Set((reviews || []).map(r => r.consumer_id)));
    const orderIds = Array.from(new Set((reviews || []).map(r => r.order_id)));

    const { data: users } = await supabase.from('users').select('user_id, email').in('user_id', consumerIds);
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', consumerIds);
    const { data: orders } = await supabase.from('orders').select('order_id, order_number').in('order_id', orderIds);

    const userMap = new Map((users || []).map(u => [u.user_id, u]));
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const orderMap = new Map((orders || []).map(o => [o.order_id, o]));

    return (reviews || []).map(r => ({
      ...r,
      consumer_email: userMap.get(r.consumer_id)?.email,
      consumer_name: profileMap.get(r.consumer_id)?.full_name,
      order_number: orderMap.get(r.order_id)?.order_number,
    }));
  }

  static async hasReviewedOrder(orderId, consumerId) {
    const { count, error } = await supabase
      .from('reviews')
      .select('review_id', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('consumer_id', consumerId);
    if (error) throw error;
    return (count || 0) > 0;
  }

  static async getReviewByOrder(orderId, consumerId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('order_id', orderId)
      .eq('consumer_id', consumerId)
      .limit(1);
    if (error) throw error;
    return (data && data[0]) || null;
  }
}

module.exports = Review;

