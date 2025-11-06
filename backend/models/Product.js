const supabase = require('../config/supabase');

class Product {
  static async createTable() {
    console.log('ℹ️  Skipping runtime product table creation. Manage schema in Supabase.');
  }

  static async create(farmerId, productData) {
    const { rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, images, sack_sizes } = productData;

    // Insert product
    const { data: products, error: insertError } = await supabase
      .from('products')
      .insert([
        {
          farmer_id: farmerId,
          rice_type,
          variety_name,
          description: description || null,
          price_per_kg,
          available_quantity,
          quantity_unit: quantity_unit || 'KG',
        },
      ])
      .select('product_id')
      .single();
    if (insertError) throw insertError;
    const productId = products.product_id;

    // Insert images
    if (images && images.length > 0) {
      const rows = images.map((url, idx) => ({ product_id: productId, image_url: url, image_order: idx }));
      const { error: imgError } = await supabase.from('product_images').insert(rows);
      if (imgError) throw imgError;
    }

    // Insert sack sizes
    if (sack_sizes && sack_sizes.length > 0) {
      const rows = sack_sizes.map(s => ({ product_id: productId, size_kg: s.size_kg, price: s.price }));
      const { error: sackError } = await supabase.from('product_sack_sizes').insert(rows);
      if (sackError) throw sackError;
    }

    return await this.findById(productId);
  }

  static async findById(productId) {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_id', productId)
      .limit(1);
    if (error) throw error;
    if (!products || products.length === 0) return null;
    const product = products[0];

    const { data: images, error: imgError } = await supabase
      .from('product_images')
      .select('image_url, image_order')
      .eq('product_id', productId)
      .order('image_order', { ascending: true });
    if (imgError) throw imgError;
    product.images = (images || []).map(r => r.image_url);

    const { data: sacks, error: sackError } = await supabase
      .from('product_sack_sizes')
      .select('size_kg, price')
      .eq('product_id', productId)
      .order('size_kg', { ascending: true });
    if (sackError) throw sackError;
    product.sack_sizes = sacks || [];

    return product;
  }

  static async findByFarmerId(farmerId, includeInactive = false) {
    let query = supabase
      .from('products')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.neq('status', 'ARCHIVED');
    }

    const { data: products, error } = await query;
    if (error) throw error;
    if (!products || products.length === 0) return [];

    const ids = products.map(p => p.product_id);
    const { data: images, error: imgError } = await supabase
      .from('product_images')
      .select('product_id, image_url, image_order')
      .in('product_id', ids)
      .order('image_order', { ascending: true });
    if (imgError) throw imgError;

    const { data: sacks, error: sackError } = await supabase
      .from('product_sack_sizes')
      .select('product_id, size_kg, price')
      .in('product_id', ids)
      .order('size_kg', { ascending: true });
    if (sackError) throw sackError;

    const imageMap = new Map();
    for (const img of images || []) {
      if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, []);
      imageMap.get(img.product_id).push(img.image_url);
    }

    const sacksMap = new Map();
    for (const s of sacks || []) {
      if (!sacksMap.has(s.product_id)) sacksMap.set(s.product_id, []);
      sacksMap.get(s.product_id).push({ size_kg: s.size_kg, price: s.price });
    }

    return products.map(p => ({
      ...p,
      images: imageMap.get(p.product_id) || [],
      sack_sizes: sacksMap.get(p.product_id) || [],
    }));
  }

  static async update(productId, farmerId, productData) {
    const updatable = ['rice_type', 'variety_name', 'description', 'price_per_kg', 'available_quantity', 'quantity_unit', 'status'];
    const patch = {};
    for (const key of updatable) {
      if (productData[key] !== undefined) patch[key] = productData[key];
    }

    if (Object.keys(patch).length > 0) {
      const { error: updError } = await supabase
        .from('products')
        .update(patch)
        .eq('product_id', productId)
        .eq('farmer_id', farmerId);
      if (updError) throw updError;
    }

    if (productData.images !== undefined) {
      const { error: delImgError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);
      if (delImgError) throw delImgError;

      if (productData.images.length > 0) {
        const rows = productData.images.map((url, idx) => ({ product_id: productId, image_url: url, image_order: idx }));
        const { error: insImgError } = await supabase.from('product_images').insert(rows);
        if (insImgError) throw insImgError;
      }
    }

    if (productData.sack_sizes !== undefined) {
      const { error: delSackError } = await supabase
        .from('product_sack_sizes')
        .delete()
        .eq('product_id', productId);
      if (delSackError) throw delSackError;

      if (productData.sack_sizes.length > 0) {
        const rows = productData.sack_sizes.map(s => ({ product_id: productId, size_kg: s.size_kg, price: s.price }));
        const { error: insSackError } = await supabase.from('product_sack_sizes').insert(rows);
        if (insSackError) throw insSackError;
      }
    }

    return await this.findById(productId);
  }

  static async archive(productId, farmerId) {
    const { data, error } = await supabase
      .from('products')
      .update({ status: 'ARCHIVED' })
      .eq('product_id', productId)
      .eq('farmer_id', farmerId)
      .select('product_id')
      .single();
    if (error) throw error;
    return data;
  }

  static async unarchive(productId, farmerId) {
    const { data, error } = await supabase
      .from('products')
      .update({ status: 'INACTIVE' })
      .eq('product_id', productId)
      .eq('farmer_id', farmerId)
      .eq('status', 'ARCHIVED')
      .select('product_id')
      .single();
    if (error) throw error;
    return data;
  }

  static async findArchivedByFarmerId(farmerId) {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('farmer_id', farmerId)
      .eq('status', 'ARCHIVED')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    if (!products || products.length === 0) return [];

    const ids = products.map(p => p.product_id);
    const { data: images } = await supabase
      .from('product_images')
      .select('product_id, image_url, image_order')
      .in('product_id', ids)
      .order('image_order', { ascending: true });
    const { data: sacks } = await supabase
      .from('product_sack_sizes')
      .select('product_id, size_kg, price')
      .in('product_id', ids)
      .order('size_kg', { ascending: true });

    const imageMap = new Map();
    for (const img of images || []) {
      if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, []);
      imageMap.get(img.product_id).push(img.image_url);
    }
    const sacksMap = new Map();
    for (const s of sacks || []) {
      if (!sacksMap.has(s.product_id)) sacksMap.set(s.product_id, []);
      sacksMap.get(s.product_id).push({ size_kg: s.size_kg, price: s.price });
    }

    return products.map(p => ({
      ...p,
      images: imageMap.get(p.product_id) || [],
      sack_sizes: sacksMap.get(p.product_id) || [],
    }));
  }

  static async updateInventory(productId, farmerId, quantity) {
    const { data, error } = await supabase
      .from('products')
      .update({ available_quantity: quantity })
      .eq('product_id', productId)
      .eq('farmer_id', farmerId)
      .select('product_id, available_quantity')
      .single();
    if (error) throw error;
    return data;
  }

  static async decrementInventory(productId, quantity) {
    // Not atomic; should be replaced by RPC for concurrency safety
    const { data: prod, error: getErr } = await supabase
      .from('products')
      .select('available_quantity')
      .eq('product_id', productId)
      .single();
    if (getErr) throw getErr;

    const newQty = Math.max(0, parseFloat(prod.available_quantity) - parseFloat(quantity));
    const { data, error } = await supabase
      .from('products')
      .update({ available_quantity: newQty })
      .eq('product_id', productId)
      .select('product_id, available_quantity')
      .single();
    if (error) throw error;
    return data;
  }

  static async incrementInventory(productId, quantity) {
    const { data: prod, error: getErr } = await supabase
      .from('products')
      .select('available_quantity')
      .eq('product_id', productId)
      .single();
    if (getErr) throw getErr;

    const newQty = parseFloat(prod.available_quantity) + parseFloat(quantity);
    const { data, error } = await supabase
      .from('products')
      .update({ available_quantity: newQty })
      .eq('product_id', productId)
      .select('product_id, available_quantity')
      .single();
    if (error) throw error;
    return data;
  }

  // ===== Consumer browsing =====
  static async getHomepageData() {
    // This is a simplified, multi-query version of the previous CTE query
    const { data: activeProducts, error } = await supabase
      .from('products')
      .select('product_id, farmer_id, price_per_kg, description, available_quantity, variety_name, rice_type, quantity_unit, created_at')
      .eq('status', 'ACTIVE');
    if (error) throw error;

    const farmerIds = Array.from(new Set(activeProducts.map(p => p.farmer_id)));
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('user_id, farm_name, full_name, address, latitude, longitude, verification_status')
      .in('user_id', farmerIds);
    if (profErr) throw profErr;

    const { data: imgs } = await supabase
      .from('product_images')
      .select('product_id, image_url, image_order')
      .in('product_id', activeProducts.map(p => p.product_id))
      .order('image_order', { ascending: true });

    const imageMap = new Map();
    for (const img of imgs || []) {
      if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, []);
      imageMap.get(img.product_id).push(img.image_url);
    }

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Featured: top farmers by product count
    const farmerCounts = new Map();
    for (const p of activeProducts) {
      const prof = profileMap.get(p.farmer_id);
      if (!prof || prof.verification_status !== 'APPROVED' || p.available_quantity <= 0) continue;
      farmerCounts.set(p.farmer_id, (farmerCounts.get(p.farmer_id) || 0) + 1);
    }
    const featuredFarmers = Array.from(farmerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([farmer_id, product_count]) => {
        const pr = profileMap.get(farmer_id);
        return { farmer_id, farm_name: pr.farm_name, full_name: pr.full_name, address: pr.address, latitude: pr.latitude, longitude: pr.longitude, average_rating: 0, total_reviews: 0, product_count };
      });

    // Popular varieties and new arrivals
    const filtered = activeProducts.filter(p => profileMap.get(p.farmer_id)?.verification_status === 'APPROVED' && p.available_quantity > 0);
    const popularVarieties = filtered
      .slice()
      .sort((a, b) => b.available_quantity - a.available_quantity || Number(new Date(b.created_at)) - Number(new Date(a.created_at)))
      .slice(0, 10)
      .map(p => ({
        ...p,
        images: imageMap.get(p.product_id) || [],
        average_rating: 0,
        total_reviews: 0,
        farm_name: profileMap.get(p.farmer_id)?.farm_name,
      }));

    const newArrivals = filtered
      .slice()
      .sort((a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at)))
      .slice(0, 10)
      .map(p => ({
        ...p,
        images: imageMap.get(p.product_id) || [],
        average_rating: 0,
        total_reviews: 0,
        farm_name: profileMap.get(p.farmer_id)?.farm_name,
      }));

    return { featured_farmers: featuredFarmers, popular_varieties: popularVarieties, new_arrivals: newArrivals };
  }

  static async searchProducts(params) {
    const {
      searchQuery = '',
      riceType = null,
      minPrice = null,
      maxPrice = null,
      consumerLat = null,
      consumerLng = null,
      minRating = null, // placeholder
      sortBy = 'newest',
      limit = 20,
      offset = 0,
    } = params;

    let query = supabase
      .from('products')
      .select('product_id, rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, created_at, farmer_id')
      .eq('status', 'ACTIVE')
      .gt('available_quantity', 0);

    if (riceType && ['MILLED', 'UNMILLED_PADDY'].includes(riceType)) {
      query = query.eq('rice_type', riceType);
    }

    if (minPrice !== null) query = query.gte('price_per_kg', parseFloat(minPrice));
    if (maxPrice !== null) query = query.lte('price_per_kg', parseFloat(maxPrice));

    if (searchQuery.trim()) {
      // Basic case-insensitive match on variety_name; could extend to farm_name via client-side join
      query = query.ilike('variety_name', `%${searchQuery.trim()}%`);
    }

    // Sort handling
    const sortMap = {
      price_low: { column: 'price_per_kg', ascending: true },
      price_high: { column: 'price_per_kg', ascending: false },
      newest: { column: 'created_at', ascending: false },
      oldest: { column: 'created_at', ascending: true },
    };
    const sort = sortMap[sortBy] || sortMap.newest;
    query = query.order(sort.column, { ascending: sort.ascending }).range(offset, offset + limit - 1);

    const { data: products, error } = await query;
    if (error) throw error;

    if (!products || products.length === 0) return [];

    const ids = products.map(p => p.product_id);
    const { data: images } = await supabase
      .from('product_images')
      .select('product_id, image_url, image_order')
      .in('product_id', ids)
      .order('image_order', { ascending: true });
    const imageMap = new Map();
    for (const img of images || []) {
      if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, []);
      imageMap.get(img.product_id).push(img.image_url);
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, farm_name, full_name, address, latitude, longitude, verification_status')
      .in('user_id', Array.from(new Set(products.map(p => p.farmer_id))));
    const profMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const withJoins = products
      .map(p => {
        const pr = profMap.get(p.farmer_id);
        if (!pr || pr.verification_status !== 'APPROVED') return null;
        return {
          ...p,
          images: imageMap.get(p.product_id) || [],
          farmer_name: pr.full_name,
          farm_name: pr.farm_name,
          farmer_address: pr.address,
          farmer_latitude: pr.latitude,
          farmer_longitude: pr.longitude,
          average_rating: 0,
          total_reviews: 0,
          distance_km: null,
        };
      })
      .filter(Boolean);

    // Distance calculation remains client-side placeholder
    return withJoins;
  }

  static async getProductDetailsForConsumer(productId) {
    const { data: products, error } = await supabase
      .from('products')
      .select('product_id, rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, created_at, updated_at, farmer_id, status')
      .eq('product_id', productId)
      .eq('status', 'ACTIVE')
      .limit(1);
    if (error) throw error;
    if (!products || products.length === 0) return null;
    const p = products[0];

    const { data: pr, error: profError } = await supabase
      .from('profiles')
      .select('farm_name, full_name, address, latitude, longitude, verification_status')
      .eq('user_id', p.farmer_id)
      .single();
    if (profError) throw profError;
    if (!pr || pr.verification_status !== 'APPROVED') return null;

    const { data: images } = await supabase
      .from('product_images')
      .select('image_url, image_order')
      .eq('product_id', p.product_id)
      .order('image_order', { ascending: true });

    const { data: sacks } = await supabase
      .from('product_sack_sizes')
      .select('size_kg, price')
      .eq('product_id', p.product_id)
      .order('size_kg', { ascending: true });

    return {
      ...p,
      farm_name: pr.farm_name,
      farmer_name: pr.full_name,
      farmer_address: pr.address,
      farmer_latitude: pr.latitude,
      farmer_longitude: pr.longitude,
      average_rating: 0,
      total_reviews: 0,
      images: (images || []).map(i => i.image_url),
      sack_sizes: sacks || [],
    };
  }

  static async getFarmerStorefront(farmerId) {
    const { data: pr, error: profError } = await supabase
      .from('profiles')
      .select('user_id, farm_name, full_name, address, latitude, longitude, verification_status')
      .eq('user_id', farmerId)
      .single();
    if (profError) throw profError;
    if (!pr || pr.verification_status !== 'APPROVED') return null;

    const { data: products, error } = await supabase
      .from('products')
      .select('product_id, rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, created_at')
      .eq('farmer_id', farmerId)
      .eq('status', 'ACTIVE')
      .gt('available_quantity', 0)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const ids = products.map(p => p.product_id);
    const { data: images } = await supabase
      .from('product_images')
      .select('product_id, image_url, image_order')
      .in('product_id', ids)
      .order('image_order', { ascending: true });
    const { data: sacks } = await supabase
      .from('product_sack_sizes')
      .select('product_id, size_kg, price')
      .in('product_id', ids)
      .order('size_kg', { ascending: true });

    const imageMap = new Map();
    for (const img of images || []) {
      if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, []);
      imageMap.get(img.product_id).push(img.image_url);
    }
    const sacksMap = new Map();
    for (const s of sacks || []) {
      if (!sacksMap.has(s.product_id)) sacksMap.set(s.product_id, []);
      sacksMap.get(s.product_id).push({ size_kg: s.size_kg, price: s.price });
    }

    return {
      farmer: {
        farmer_id: pr.user_id,
        farm_name: pr.farm_name,
        full_name: pr.full_name,
        address: pr.address,
        latitude: pr.latitude,
        longitude: pr.longitude,
        verification_status: pr.verification_status,
        average_rating: 0,
        total_reviews: 0,
      },
      products: products.map(p => ({
        ...p,
        images: imageMap.get(p.product_id) || [],
        sack_sizes: sacksMap.get(p.product_id) || [],
      })),
    };
  }
}

module.exports = Product;

