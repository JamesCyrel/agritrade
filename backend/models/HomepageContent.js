const supabase = require('../config/supabase');

class HomepageContent {
  // Create homepage content tables (AD-5)
  static async createTable() {
    // Schema managed by Supabase migrations
    console.log('ℹ️  HomepageContent.createTable skipped (managed in Supabase)');
  }

  // Add featured farmer
  static async addFeaturedFarmer(farmerId, displayOrder = null) {
    // Get max order if not provided
    if (displayOrder === null) {
      const { data: maxRows, error: maxErr } = await supabase
        .from('featured_farmers')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);
      if (maxErr) throw maxErr;
      const next = (maxRows?.[0]?.display_order || 0) + 1;
      displayOrder = next;
    }

    const { data, error } = await supabase
      .from('featured_farmers')
      .upsert({
        farmer_id: farmerId,
        display_order: displayOrder,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'farmer_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Remove featured farmer
  static async removeFeaturedFarmer(farmerId) {
    const { data, error } = await supabase
      .from('featured_farmers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('farmer_id', farmerId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Get all featured farmers
  static async getFeaturedFarmers(activeOnly = false) {
    const query = supabase
      .from('featured_farmers')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (activeOnly) query.eq('is_active', true);
    const { data: rows, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all(rows.map(async (ff) => {
      const [{ data: profile }, { data: reviewRows }] = await Promise.all([
        supabase.from('profiles').select('farm_name, full_name, verification_status').eq('user_id', ff.farmer_id).maybeSingle(),
        supabase.from('reviews').select('rating').eq('farmer_id', ff.farmer_id),
      ]);
      let average_rating = 0;
      if (reviewRows && reviewRows.length) {
        const sum = reviewRows.reduce((s, r) => s + Number(r.rating || 0), 0);
        average_rating = sum / reviewRows.length;
      }
      return {
        ...ff,
        farm_name: profile?.farm_name || null,
        full_name: profile?.full_name || null,
        verification_status: profile?.verification_status || null,
        average_rating,
      };
    }));

    return enriched;
  }

  // Update display order
  static async updateDisplayOrder(farmerId, displayOrder) {
    const { data, error } = await supabase
      .from('featured_farmers')
      .update({ display_order: displayOrder, updated_at: new Date().toISOString() })
      .eq('farmer_id', farmerId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

module.exports = HomepageContent;

