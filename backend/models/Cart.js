const supabase = require('../config/supabase');

class Cart {
  static async createTable() {
    console.log('ℹ️  Skipping runtime cart table creation. Manage schema in Supabase.');
  }

  static async addItem(userId, productId, quantity, unitPrice, sackSizeKg = null) {
    // Check if cart item exists (same product + sack size variant)
    const { data: existing, error: existErr } = await supabase
      .from('cart_items')
      .select('cart_item_id, quantity')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .or(sackSizeKg === null ? 'sack_size_kg.is.null' : `sack_size_kg.eq.${sackSizeKg}`)
      .limit(1);
    if (existErr) throw existErr;

    if (existing && existing.length > 0) {
      const newQuantity = parseFloat(existing[0].quantity) + parseFloat(quantity);
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('cart_item_id', existing[0].cart_item_id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('cart_items')
      .insert([
        {
          user_id: userId,
          product_id: productId,
          quantity: parseFloat(quantity),
          unit_price: parseFloat(unitPrice),
          sack_size_kg: sackSizeKg,
        },
      ])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async getCartItems(userId) {
    const { data: items, error } = await supabase
      .from('cart_items')
      .select('cart_item_id, quantity, unit_price, sack_size_kg, created_at, updated_at, product_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    if (!items || items.length === 0) return [];
    const productIds = items.map(i => i.product_id);

    const { data: products } = await supabase
      .from('products')
      .select('product_id, rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, farmer_id')
      .in('product_id', productIds);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, farm_name, full_name')
      .in('user_id', (products || []).map(p => p.farmer_id));

    const { data: images } = await supabase
      .from('product_images')
      .select('product_id, image_url, image_order')
      .in('product_id', productIds)
      .order('image_order', { ascending: true });

    const productById = new Map((products || []).map(p => [p.product_id, p]));
    const profileByUserId = new Map((profiles || []).map(p => [p.user_id, p]));
    const imageMap = new Map();
    for (const img of images || []) {
      if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, []);
      imageMap.get(img.product_id).push(img.image_url);
    }

    return items.map(ci => {
      const p = productById.get(ci.product_id);
      const pr = p ? profileByUserId.get(p.farmer_id) : null;
      return {
        ...ci,
        product_id: p?.product_id,
        rice_type: p?.rice_type,
        variety_name: p?.variety_name,
        description: p?.description,
        price_per_kg: p?.price_per_kg,
        available_quantity: p?.available_quantity,
        quantity_unit: p?.quantity_unit,
        farmer_id: p?.farmer_id,
        farm_name: pr?.farm_name,
        farmer_name: pr?.full_name,
        images: imageMap.get(ci.product_id) || [],
        sack_sizes: [],
      };
    });
  }

  static async updateQuantity(cartItemId, userId, quantity) {
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity: parseFloat(quantity) })
      .eq('cart_item_id', cartItemId)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async removeItem(cartItemId, userId) {
    const { data, error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_item_id', cartItemId)
      .eq('user_id', userId)
      .select('cart_item_id')
      .single();
    if (error) throw error;
    return data;
  }

  static async clearCart(userId) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }

  static async getCartItemById(cartItemId, userId) {
    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_item_id', cartItemId)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data || null;
  }
}

module.exports = Cart;

