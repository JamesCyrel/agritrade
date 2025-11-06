const supabase = require('../config/supabase');
const Product = require('./Product');

class Order {
  static async createTable() {
    console.log('ℹ️  Skipping runtime order table creation. Manage schema in Supabase.');
  }

  static generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
  }

  static async createOrder(orderData) {
    const {
      consumerId,
      farmerId,
      deliveryAddressId,
      paymentMethodId,
      paymentType = 'DIGITAL',
      subtotal,
      deliveryFee = 0,
      tax = 0,
      discountAmount = 0,
      promoCode = null,
      totalAmount,
      notes = null,
      items,
    } = orderData;

    const orderNumber = this.generateOrderNumber();
    const finalPaymentType = paymentType || (paymentMethodId === 'COD' ? 'COD' : 'DIGITAL');
    const finalPaymentMethodId = finalPaymentType === 'COD' ? null : paymentMethodId;

    // Insert order header
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert([
        {
          consumer_id: consumerId,
          farmer_id: farmerId,
          order_number: orderNumber,
          delivery_address_id: deliveryAddressId || null,
          payment_method_id: finalPaymentMethodId,
          payment_type: finalPaymentType,
          subtotal: parseFloat(subtotal),
          delivery_fee: parseFloat(deliveryFee),
          tax: parseFloat(tax),
          discount_amount: parseFloat(discountAmount),
          promo_code: promoCode,
          total_amount: parseFloat(totalAmount),
          notes: notes || null,
        },
      ])
      .select('*')
      .single();
    if (orderErr) throw orderErr;

    // Insert items
    if (items && items.length > 0) {
      const rows = items.map(i => ({
        order_id: order.order_id,
        product_id: i.product_id,
        quantity: parseFloat(i.quantity),
        unit_price: parseFloat(i.unit_price),
        sack_size_kg: i.sack_size_kg || null,
        subtotal: parseFloat(i.subtotal),
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(rows);
      if (itemsErr) throw itemsErr;
    }

    // Update promo usage
    if (promoCode) {
      await supabase
        .from('promo_codes')
        .update({ used_count: supabase.rpc('increment_value', { current: 'used_count', inc: 1 }) }) // placeholder; safe update via RPC later
        .eq('code', promoCode);
    }

    return order;
  }

  static async getConsumerOrders(consumerId) {
    // orders + farmer profile + address
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('consumer_id', consumerId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    if (!orders || orders.length === 0) return [];

    const farmerIds = Array.from(new Set(orders.map(o => o.farmer_id)));
    const addrIds = Array.from(new Set(orders.map(o => o.delivery_address_id).filter(Boolean)));

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, farm_name, full_name')
      .in('user_id', farmerIds);
    const { data: addresses } = await supabase
      .from('consumer_addresses')
      .select('address_id, full_address, city, state, postal_code')
      .in('address_id', addrIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const addrMap = new Map((addresses || []).map(a => [a.address_id, a]));

    return orders.map(o => ({
      ...o,
      farm_name: profileMap.get(o.farmer_id)?.farm_name,
      farmer_name: profileMap.get(o.farmer_id)?.full_name,
      delivery_address: addrMap.get(o.delivery_address_id)?.full_address,
      city: addrMap.get(o.delivery_address_id)?.city,
      state: addrMap.get(o.delivery_address_id)?.state,
      postal_code: addrMap.get(o.delivery_address_id)?.postal_code,
    }));
  }

  static async getOrderDetails(orderId, consumerId) {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('consumer_id', consumerId)
      .single();
    if (error) return null;

    const { data: pr } = await supabase
      .from('profiles')
      .select('farm_name, full_name')
      .eq('user_id', order.farmer_id)
      .single();

    const { data: addr } = await supabase
      .from('consumer_addresses')
      .select('full_address, city, state, postal_code')
      .eq('address_id', order.delivery_address_id)
      .maybeSingle();

    const { data: items } = await supabase
      .from('order_items')
      .select('*, product_id')
      .eq('order_id', orderId);

    // Attach images and names for items
    const productIds = (items || []).map(i => i.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('product_id, variety_name, rice_type')
      .in('product_id', productIds);
    const { data: images } = await supabase
      .from('product_images')
      .select('product_id, image_url, image_order')
      .in('product_id', productIds)
      .order('image_order', { ascending: true });

    const prodMap = new Map((products || []).map(p => [p.product_id, p]));
    const imageMap = new Map();
    for (const img of images || []) {
      if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, []);
      imageMap.get(img.product_id).push(img.image_url);
    }

    order.farm_name = pr?.farm_name;
    order.farmer_name = pr?.full_name;
    order.delivery_address = addr?.full_address;
    order.city = addr?.city;
    order.state = addr?.state;
    order.postal_code = addr?.postal_code;
    order.items = (items || []).map(i => ({
      ...i,
      variety_name: prodMap.get(i.product_id)?.variety_name,
      rice_type: prodMap.get(i.product_id)?.rice_type,
      images: imageMap.get(i.product_id) || [],
    }));

    return order;
  }

  static async getFarmerOrders(farmerId, status = null) {
    let query = supabase
      .from('orders')
      .select('*')
      .eq('farmer_id', farmerId);

    if (status) query = query.eq('status', status);
    const { data: orders, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    if (!orders || orders.length === 0) return [];

    const orderIds = orders.map(o => o.order_id);
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, order_item_id, product_id, quantity, unit_price, sack_size_kg, subtotal')
      .in('order_id', orderIds);

    const { data: consumers } = await supabase
      .from('users')
      .select('user_id, email, phone')
      .in('user_id', Array.from(new Set(orders.map(o => o.consumer_id))));

    const { data: addresses } = await supabase
      .from('consumer_addresses')
      .select('address_id, full_address, city, state, postal_code')
      .in('address_id', Array.from(new Set(orders.map(o => o.delivery_address_id).filter(Boolean))));

    const consumerMap = new Map((consumers || []).map(c => [c.user_id, c]));
    const addrMap = new Map((addresses || []).map(a => [a.address_id, a]));
    const itemsByOrder = new Map();
    for (const it of items || []) {
      if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
      itemsByOrder.get(it.order_id).push(it);
    }

    return orders.map(o => ({
      ...o,
      consumer_email: consumerMap.get(o.consumer_id)?.email,
      consumer_phone: consumerMap.get(o.consumer_id)?.phone,
      delivery_address: addrMap.get(o.delivery_address_id)?.full_address,
      city: addrMap.get(o.delivery_address_id)?.city,
      state: addrMap.get(o.delivery_address_id)?.state,
      postal_code: addrMap.get(o.delivery_address_id)?.postal_code,
      items: itemsByOrder.get(o.order_id) || [],
    }));
  }

  static async getFarmerOrderDetails(orderId, farmerId) {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('farmer_id', farmerId)
      .single();
    if (error) return null;

    const { data: consumer } = await supabase
      .from('users')
      .select('email, phone')
      .eq('user_id', order.consumer_id)
      .single();

    const { data: addr } = await supabase
      .from('consumer_addresses')
      .select('full_address, city, state, postal_code')
      .eq('address_id', order.delivery_address_id)
      .maybeSingle();

    const { data: items } = await supabase
      .from('order_items')
      .select('order_item_id, product_id, quantity, unit_price, sack_size_kg, subtotal')
      .eq('order_id', orderId);

    return {
      ...order,
      consumer_email: consumer?.email,
      consumer_phone: consumer?.phone,
      delivery_address: addr?.full_address,
      city: addr?.city,
      state: addr?.state,
      postal_code: addr?.postal_code,
      items: items || [],
    };
  }

  static async acceptOrder(orderId, farmerId) {
    // Ensure pending within 24h
    const { data: existing, error: exErr } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('farmer_id', farmerId)
      .eq('status', 'PENDING')
      .gt('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .single();
    if (exErr || !existing) throw new Error('Order not found, not pending, or past acceptance timeframe');

    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'CONFIRMED' })
      .eq('order_id', orderId)
      .eq('farmer_id', farmerId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async rejectOrder(orderId, farmerId, reason, notes = null) {
    const { data: existing, error: exErr } = await supabase
      .from('orders')
      .select('order_id')
      .eq('order_id', orderId)
      .eq('farmer_id', farmerId)
      .eq('status', 'PENDING')
      .single();
    if (exErr || !existing) throw new Error('Order not found or not in pending status');

    const { error: recErr } = await supabase
      .from('order_rejections')
      .insert([{ order_id: orderId, reason, notes: notes || null }]);
    if (recErr) throw recErr;

    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'CANCELLED' })
      .eq('order_id', orderId)
      .eq('farmer_id', farmerId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async updateStatus(orderId, farmerId, status) {
    const validStatuses = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    if (!validStatuses.includes(status)) throw new Error('Invalid status for this operation');

    const { data: current, error: curErr } = await supabase
      .from('orders')
      .select('status')
      .eq('order_id', orderId)
      .eq('farmer_id', farmerId)
      .single();
    if (curErr || !current) throw new Error('Order not found');

    const validTransitions = {
      CONFIRMED: ['PREPARING', 'OUT_FOR_DELIVERY'],
      PREPARING: ['OUT_FOR_DELIVERY'],
      OUT_FOR_DELIVERY: ['DELIVERED'],
    };
    if (validTransitions[current.status] && !validTransitions[current.status].includes(status)) {
      throw new Error(`Cannot transition from ${current.status} to ${status}`);
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('order_id', orderId)
      .eq('farmer_id', farmerId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async cancelOrderByConsumer(orderId, consumerId) {
    // Validate order
    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .select('order_id')
      .eq('order_id', orderId)
      .eq('consumer_id', consumerId)
      .eq('status', 'PENDING')
      .single();
    if (ordErr || !order) throw new Error('Order not found, not yours, or not in pending status');

    // Get order items
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('product_id, quantity, sack_size_kg')
      .eq('order_id', orderId);
    if (itemsErr) throw itemsErr;

    // Cancel order
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'CANCELLED' })
      .eq('order_id', orderId)
      .eq('consumer_id', consumerId)
      .select('*')
      .single();
    if (error) throw error;

    // Restore inventory
    for (const item of items || []) {
      const quantityToRestore = item.sack_size_kg
        ? parseFloat(item.quantity) * parseFloat(item.sack_size_kg)
        : parseFloat(item.quantity);
      await Product.incrementInventory(item.product_id, quantityToRestore);
    }

    return data;
  }

  static async autoCancelPendingOrders() {
    // Not atomic; consider a scheduled RPC later
    const threshold = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: toCancel, error: listErr } = await supabase
      .from('orders')
      .select('order_id, order_number, consumer_id')
      .lt('created_at', threshold)
      .eq('status', 'PENDING');
    if (listErr) throw listErr;

    const ids = (toCancel || []).map(o => o.order_id);
    if (ids.length === 0) return [];

    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status: 'CANCELLED' })
      .in('order_id', ids)
      .select('*');
    if (error) throw error;

    // Notifications left as-is; call Notification.createNotification if needed
    return updated || [];
  }

  static async validatePromoCode(code, orderAmount) {
    const { data: promos, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .lte('min_order_amount', parseFloat(orderAmount));
    if (error) throw error;
    if (!promos || promos.length === 0) return null;

    const promo = promos[0];
    let discountAmount = 0;
    if (promo.discount_type === 'PERCENTAGE') {
      discountAmount = (orderAmount * parseFloat(promo.discount_value)) / 100;
      if (promo.max_discount_amount) discountAmount = Math.min(discountAmount, parseFloat(promo.max_discount_amount));
    } else {
      discountAmount = parseFloat(promo.discount_value);
    }

    return {
      code: promo.code,
      discount_amount: discountAmount,
      discount_type: promo.discount_type,
      description: promo.description,
    };
  }

  static async calculateDeliveryFee(farmerLat, farmerLng, consumerLat, consumerLng) {
    const Notification = require('./Notification');
    return await Notification.calculateDeliveryFee(farmerLat, farmerLng, consumerLat, consumerLng);
  }
}

module.exports = Order;

