const supabase = require('../config/supabase');

class Consumer {
  static async createTables() {
    console.log('ℹ️  Skipping runtime consumer table creation. Manage schema in Supabase.');
  }

  static async getProfile(userId) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, user_id')
      .eq('user_id', userId)
      .single();
    if (error) throw error;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, phone')
      .eq('user_id', userId)
      .single();
    if (userError) throw userError;

    return profile && user ? { full_name: profile.full_name, email: user.email, phone: user.phone } : null;
  }

  static async updateProfile(userId, fullName) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('user_id', userId)
      .select('full_name')
      .single();
    if (error) throw error;
    return data;
  }

  static async getAddresses(userId) {
    const { data, error } = await supabase
      .from('consumer_addresses')
      .select('address_id, label, full_address, city, state, postal_code, is_default, created_at')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async addAddress(userId, addressData) {
    const { label, full_address, city, state, postal_code, is_default } = addressData;

    if (is_default) {
      const { error: unsetError } = await supabase
        .from('consumer_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
      if (unsetError) throw unsetError;
    }

    const { data, error } = await supabase
      .from('consumer_addresses')
      .insert([
        {
          user_id: userId,
          label: label || null,
          full_address,
          city: city || null,
          state: state || null,
          postal_code: postal_code || null,
          is_default: !!is_default,
        },
      ])
      .select('address_id, label, full_address, city, state, postal_code, is_default')
      .single();
    if (error) throw error;
    return data;
  }

  static async updateAddress(userId, addressId, addressData) {
    const { label, full_address, city, state, postal_code, is_default } = addressData;

    if (is_default) {
      const { error: unsetError } = await supabase
        .from('consumer_addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .neq('address_id', addressId);
      if (unsetError) throw unsetError;
    }

    const { data, error } = await supabase
      .from('consumer_addresses')
      .update({
        label: label || null,
        full_address,
        city: city || null,
        state: state || null,
        postal_code: postal_code || null,
        is_default: !!is_default,
      })
      .eq('address_id', addressId)
      .eq('user_id', userId)
      .select('address_id, label, full_address, city, state, postal_code, is_default')
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteAddress(userId, addressId) {
    const { data, error } = await supabase
      .from('consumer_addresses')
      .delete()
      .eq('address_id', addressId)
      .eq('user_id', userId)
      .select('address_id')
      .single();
    if (error) throw error;
    return data;
  }

  static async getPaymentMethods(userId) {
    const { data, error } = await supabase
      .from('consumer_payment_methods')
      .select('payment_id, payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default, created_at')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async addPaymentMethod(userId, paymentData) {
    const { payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default } = paymentData;

    if (is_default) {
      const { error: unsetError } = await supabase
        .from('consumer_payment_methods')
        .update({ is_default: false })
        .eq('user_id', userId);
      if (unsetError) throw unsetError;
    }

    const { data, error } = await supabase
      .from('consumer_payment_methods')
      .insert([
        {
          user_id: userId,
          payment_type,
          card_number_last4: card_number_last4 || null,
          card_holder_name: card_holder_name || null,
          expiry_month: expiry_month || null,
          expiry_year: expiry_year || null,
          upi_id: upi_id || null,
          wallet_provider: wallet_provider || null,
          is_default: !!is_default,
        },
      ])
      .select('payment_id, payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default')
      .single();
    if (error) throw error;
    return data;
  }

  static async updatePaymentMethod(userId, paymentId, paymentData) {
    const { payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default } = paymentData;

    if (is_default) {
      const { error: unsetError } = await supabase
        .from('consumer_payment_methods')
        .update({ is_default: false })
        .eq('user_id', userId)
        .neq('payment_id', paymentId);
      if (unsetError) throw unsetError;
    }

    const { data, error } = await supabase
      .from('consumer_payment_methods')
      .update({
        payment_type,
        card_number_last4: card_number_last4 || null,
        card_holder_name: card_holder_name || null,
        expiry_month: expiry_month || null,
        expiry_year: expiry_year || null,
        upi_id: upi_id || null,
        wallet_provider: wallet_provider || null,
        is_default: !!is_default,
      })
      .eq('payment_id', paymentId)
      .eq('user_id', userId)
      .select('payment_id, payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default')
      .single();
    if (error) throw error;
    return data;
  }

  static async deletePaymentMethod(userId, paymentId) {
    const { data, error } = await supabase
      .from('consumer_payment_methods')
      .delete()
      .eq('payment_id', paymentId)
      .eq('user_id', userId)
      .select('payment_id')
      .single();
    if (error) throw error;
    return data;
  }

  static async addFavorite(userId, productId) {
    const { data, error } = await supabase
      .from('consumer_favorites')
      .insert([{ user_id: userId, product_id: productId }], { upsert: true })
      .select('favorite_id, user_id, product_id, created_at')
      .single();
    if (error) throw error;
    return data;
  }

  static async removeFavorite(userId, productId) {
    const { data, error } = await supabase
      .from('consumer_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)
      .select('favorite_id')
      .single();
    if (error) throw error;
    return data;
  }

  static async getFavorites(userId) {
    // Fetch favorite list
    const { data: favorites, error } = await supabase
      .from('consumer_favorites')
      .select('favorite_id, created_at, product_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    if (!favorites || favorites.length === 0) return [];
    const productIds = favorites.map(f => f.product_id);

    // Fetch products + images
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('product_id, variety_name, rice_type, price_per_kg, available_quantity, quantity_unit, description, status, farmer_id')
      .in('product_id', productIds)
      .eq('status', 'ACTIVE');
    if (prodError) throw prodError;

    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('user_id, farm_name, full_name, verification_status')
      .in('user_id', products.map(p => p.farmer_id));
    if (profError) throw profError;

    const { data: images, error: imgError } = await supabase
      .from('product_images')
      .select('product_id, image_url, image_order')
      .in('product_id', productIds)
      .order('image_order', { ascending: true });
    if (imgError) throw imgError;

    const productIdToImages = new Map();
    for (const img of images || []) {
      if (!productIdToImages.has(img.product_id)) productIdToImages.set(img.product_id, []);
      productIdToImages.get(img.product_id).push(img.image_url);
    }

    const profileByUserId = new Map((profiles || []).map(p => [p.user_id, p]));
    const productById = new Map((products || []).map(p => [p.product_id, p]));

    return favorites
      .map(f => {
        const p = productById.get(f.product_id);
        if (!p) return null;
        const pr = profileByUserId.get(p.farmer_id);
        if (!pr || pr.verification_status !== 'APPROVED') return null;
        return {
          favorite_id: f.favorite_id,
          favorited_at: f.created_at,
          product_id: p.product_id,
          variety_name: p.variety_name,
          rice_type: p.rice_type,
          price_per_kg: p.price_per_kg,
          available_quantity: p.available_quantity,
          quantity_unit: p.quantity_unit,
          description: p.description,
          status: p.status,
          farm_name: pr.farm_name,
          farmer_name: pr.full_name,
          farmer_id: p.farmer_id,
          average_rating: 0,
          total_reviews: 0,
          images: productIdToImages.get(p.product_id) || [],
        };
      })
      .filter(Boolean);
  }

  static async isFavorite(userId, productId) {
    const { count, error } = await supabase
      .from('consumer_favorites')
      .select('favorite_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('product_id', productId);
    if (error) throw error;
    return (count || 0) > 0;
  }
}

module.exports = Consumer;

