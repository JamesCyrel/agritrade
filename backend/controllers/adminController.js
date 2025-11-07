const supabase = require('../config/supabase');
const pool = require('../config/database');
const Profile = require('../models/Profile');
const Verification = require('../models/Verification');

// List all users with optional role/status filters
exports.listUsers = async (req, res) => {
  try {
    const { role, status } = req.query; // status = profile.verification_status for farmers
    const params = [];
    let where = [];

    if (role) {
      params.push(role.toUpperCase());
      where.push(`u.role = $${params.length}`);
    }

    if (status) {
      params.push(status.toUpperCase());
      where.push(`p.verification_status = $${params.length}`);
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('user_id, email, phone, role, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const userIds = users.map(u => u.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, farm_name, verification_status')
      .in('user_id', userIds);
    const profileByUser = new Map((profiles || []).map(p => [p.user_id, p]));

    let merged = users.map(u => ({ ...u, ...(profileByUser.get(u.user_id) || {}) }));
    if (role) merged = merged.filter(u => u.role === role.toUpperCase());
    if (status) merged = merged.filter(u => (u.verification_status || '').toUpperCase() === status.toUpperCase());

    res.json({ success: true, data: merged });
  } catch (error) {
    console.error('listUsers error', error);
    res.status(500).json({ success: false, message: 'Failed to list users' });
  }
};

// List farmers with PENDING_REVIEW only (after they submit documents)
exports.listPendingFarmers = async (req, res) => {
  try {
    const { data: farmers, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, farm_name, verification_status, updated_at')
      .eq('verification_status', 'PENDING_REVIEW') // Only show farmers who have submitted for review
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const { data: users } = await supabase
      .from('users')
      .select('user_id, email, phone, role')
      .in('user_id', (farmers || []).map(f => f.user_id))
      .eq('role', 'FARMER');
    const userById = new Map((users || []).map(u => [u.user_id, u]));
    const merged = (farmers || []).map(f => ({ ...userById.get(f.user_id), ...f }));
    res.json({ success: true, data: merged });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list farmers' });
  }
};

// Get farmer application details (profile + documents)
exports.getFarmerApplication = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get profile (may not exist yet)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('email, phone, role')
      .eq('user_id', userId)
      .single();
    
    // Get documents
    const documents = await Verification.listDocuments(userId);
    
    res.json({ 
      success: true, 
      data: { 
        profile: profile || {}, 
        user: user || {},
        documents 
      } 
    });
  } catch (error) {
    console.error('getFarmerApplication error:', error);
    res.status(500).json({ success: false, message: 'Failed to get application' });
  }
};

// Approve verification
exports.approveFarmer = async (req, res) => {
  try {
    const { userId } = req.params;
    await Profile.setVerificationStatus(userId, 'APPROVED');
    // TODO: send notification
    res.json({ success: true, message: 'Farmer approved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve' });
  }
};

// Reject verification with reason
exports.rejectFarmer = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Reason is required' });
    await Profile.setVerificationStatus(userId, 'REJECTED', reason);
    // TODO: send notification
    res.json({ success: true, message: 'Farmer rejected', data: { reason } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject' });
  }
};

// AD-1: Get user profile details
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const [{ data: user }, { data: profile }] = await Promise.all([
      supabase.from('users').select('*').eq('user_id', userId).single(),
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const merged = { ...user, ...(profile || {}) };
    
    // Get additional data based on role
    if (merged.role === 'FARMER') {
      // Get verification documents
      const Verification = require('../models/Verification');
      const documents = await Verification.listDocuments(userId);
      merged.documents = documents;
    } else if (merged.role === 'CONSUMER') {
      // Get consumer addresses and payment methods count
      const Consumer = require('../models/Consumer');
      const addresses = await Consumer.getAddresses(userId);
      const paymentMethods = await Consumer.getPaymentMethods(userId);
      merged.addresses = addresses;
      merged.payment_methods = paymentMethods;
    }
    
    res.json({ success: true, data: merged });
  } catch (error) {
    console.error('getUserProfile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user profile' });
  }
};

// AD-1: Suspend user
exports.suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    // Add a suspended status or flag to users table
    // For now, we'll use a simple approach - add a is_suspended column if it doesn't exist
    const { error } = await supabase
      .from('users')
      .update({ is_suspended: true })
      .eq('user_id', userId);
    if (error) throw error;
    
    // TODO: Send notification to user
    
    res.json({ success: true, message: 'User suspended successfully' });
  } catch (error) {
    console.error('suspendUser error:', error);
    res.status(500).json({ success: false, message: 'Failed to suspend user' });
  }
};

// AD-1: Activate user (unsuspend)
exports.activateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { error } = await supabase
      .from('users')
      .update({ is_suspended: false })
      .eq('user_id', userId);
    if (error) throw error;
    
    // TODO: Send notification to user
    
    res.json({ success: true, message: 'User activated successfully' });
  } catch (error) {
    console.error('activateUser error:', error);
    res.status(500).json({ success: false, message: 'Failed to activate user' });
  }
};

// AD-2: Get all orders with filters
exports.getAllOrders = async (req, res) => {
  try {
    // Use Supabase for simpler queries
    const { status, farmerId, consumerId, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (status) {
      query = query.eq('status', status.toUpperCase());
    }
    
    if (farmerId) {
      query = query.eq('farmer_id', farmerId);
    }
    
    if (consumerId) {
      query = query.eq('consumer_id', consumerId);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    // Enrich with farmer details if we have orders
    if (data && data.length > 0) {
      const farmerIds = [...new Set(data.map(o => o.farmer_id).filter(Boolean))];
      if (farmerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, farm_name, full_name')
          .in('user_id', farmerIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        data.forEach(order => {
          const profile = profileMap.get(order.farmer_id);
          if (profile) {
            order.farmer_name = profile.full_name;
            order.farm_name = profile.farm_name;
          }
        });
      }
    }
    
    res.json({ 
      success: true, 
      data: data || [],
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('getAllOrders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// AD-2: Get order details (admin view)
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();
    
    if (orderError || !order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Get farmer profile
    if (order.farmer_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('farm_name, full_name')
        .eq('user_id', order.farmer_id)
        .single();
      
      if (profile) {
        order.farmer_name = profile.full_name;
        order.farm_name = profile.farm_name;
      }
    }
    
    // Get order items with product details
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    
    if (items && items.length > 0) {
      const productIds = items.map(item => item.product_id);
      const { data: products } = await supabase
        .from('products')
        .select('product_id, variety_name, rice_type')
        .in('product_id', productIds);
      
      const productMap = new Map((products || []).map(p => [p.product_id, p]));
      items.forEach(item => {
        const product = productMap.get(item.product_id);
        if (product) {
          item.variety_name = product.variety_name;
          item.rice_type = product.rice_type;
        }
      });
    }
    
    order.items = items || [];
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('getOrderDetails error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
};

// AD-3: Get all payment transactions
exports.getAllTransactions = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Transactions endpoint under migration to Supabase' });
};

// AD-3: Process refund
exports.processRefund = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Refund processing under migration to Supabase' });
};

// AD-3: Get all payouts
exports.getAllPayouts = async (req, res) => {
  try {
    // Return empty data for now - to be implemented with full payout system
    res.json({ 
      success: true, 
      data: [],
      message: 'Payout system pending implementation'
    });
  } catch (error) {
    console.error('getAllPayouts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payouts' });
  }
};

// AD-3: Get payout details
exports.getPayoutDetails = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Payout details under migration to Supabase' });
};

// AD-3: Approve payout
exports.approvePayout = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Approve payout under migration to Supabase' });
};

// AD-3: Complete payout (mark as completed after transfer)
exports.completePayout = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Complete payout under migration to Supabase' });
};

// AD-3: Reject payout
exports.rejectPayout = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Reject payout under migration to Supabase' });
};

// AD-3: Get/Update commission settings
exports.getCommissionSettings = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Commission settings under migration to Supabase' });
};

exports.updateCommissionSettings = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Update commission settings under migration to Supabase' });
};

// AD-6: Get analytics and KPIs
exports.getAnalytics = async (req, res) => {
  try {
    // Get basic analytics from Supabase
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, role', { count: 'exact', head: true });
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('order_id, total_amount, status', { count: 'exact' });
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('product_id', { count: 'exact', head: true });
    
    // Calculate basic stats
    const totalRevenue = (orders || [])
      .filter(o => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    
    const analytics = {
      totalUsers: users?.length || 0,
      totalOrders: orders?.length || 0,
      totalProducts: products?.length || 0,
      totalRevenue: totalRevenue.toFixed(2),
      pendingOrders: (orders || []).filter(o => o.status === 'PENDING').length,
      completedOrders: (orders || []).filter(o => o.status === 'COMPLETED').length,
    };
    
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('getAnalytics error:', error);
    res.json({ 
      success: true, 
      data: {
        totalUsers: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalRevenue: '0.00',
        pendingOrders: 0,
        completedOrders: 0,
      }
    });
  }
};

// AD-4: Get all disputes
exports.getAllDisputes = async (req, res) => {
  try {
    const { status, disputeType, reportedBy, limit = 50, offset = 0 } = req.query;
    
    const Dispute = require('../models/Dispute');
    const disputes = await Dispute.getAllDisputes({
      status,
      disputeType,
      reportedBy,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({ success: true, data: disputes });
  } catch (error) {
    console.error('getAllDisputes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch disputes' });
  }
};

// AD-4: Get dispute details
exports.getDisputeDetails = async (req, res) => {
  try {
    const { disputeId } = req.params;
    
    const Dispute = require('../models/Dispute');
    const dispute = await Dispute.getDisputeById(disputeId);
    
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }
    
    res.json({ success: true, data: dispute });
  } catch (error) {
    console.error('getDisputeDetails error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dispute details' });
  }
};

// AD-4: Update dispute (resolve, add notes, etc.)
exports.updateDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { status, adminNotes, resolution } = req.body;
    const adminId = req.user.userId;
    
    const Dispute = require('../models/Dispute');
    const dispute = await Dispute.updateDispute(disputeId, {
      status,
      adminNotes,
      resolution,
      resolvedBy: adminId
    });
    
    // TODO: Send notification to involved parties
    
    res.json({ success: true, message: 'Dispute updated successfully', data: dispute });
  } catch (error) {
    console.error('updateDispute error:', error);
    res.status(500).json({ success: false, message: 'Failed to update dispute' });
  }
};

// AD-5: Get featured farmers
exports.getFeaturedFarmers = async (req, res) => {
  try {
    const HomepageContent = require('../models/HomepageContent');
    const farmers = await HomepageContent.getFeaturedFarmers(false);
    
    res.json({ success: true, data: farmers });
  } catch (error) {
    console.error('getFeaturedFarmers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch featured farmers' });
  }
};

// AD-5: Add featured farmer
exports.addFeaturedFarmer = async (req, res) => {
  try {
    const { farmerId, displayOrder } = req.body;
    
    if (!farmerId) {
      return res.status(400).json({ success: false, message: 'Farmer ID is required' });
    }
    
    const HomepageContent = require('../models/HomepageContent');
    const featured = await HomepageContent.addFeaturedFarmer(farmerId, displayOrder);
    
    res.json({ success: true, message: 'Farmer added to featured list', data: featured });
  } catch (error) {
    console.error('addFeaturedFarmer error:', error);
    res.status(500).json({ success: false, message: 'Failed to add featured farmer' });
  }
};

// AD-5: Remove featured farmer
exports.removeFeaturedFarmer = async (req, res) => {
  try {
    const { farmerId } = req.params;
    
    const HomepageContent = require('../models/HomepageContent');
    await HomepageContent.removeFeaturedFarmer(farmerId);
    
    res.json({ success: true, message: 'Farmer removed from featured list' });
  } catch (error) {
    console.error('removeFeaturedFarmer error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove featured farmer' });
  }
};

// AD-5: Get all promo codes
exports.getAllPromoCodes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('getAllPromoCodes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo codes' });
  }
};

// AD-5: Create promo code
exports.createPromoCode = async (req, res) => {
  try {
    const { code, description, discountType, discountValue, minOrderAmount, maxDiscountAmount, usageLimit, validFrom, validUntil, isActive } = req.body;
    
    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ 
        success: false, 
        message: 'Code, discount type, and discount value are required' 
      });
    }
    
    const { data, error } = await supabase
      .from('promo_codes')
      .insert([
        {
          code,
          description: description || null,
          discount_type: discountType,
          discount_value: discountValue,
          min_order_amount: minOrderAmount || 0,
          max_discount_amount: maxDiscountAmount || null,
          usage_limit: usageLimit || null,
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          is_active: isActive !== false,
        },
      ])
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ success: false, message: 'Promo code already exists' });
      }
      throw error;
    }
    res.json({ success: true, message: 'Promo code created successfully', data });
  } catch (error) {
    console.error('createPromoCode error:', error);
    res.status(500).json({ success: false, message: 'Failed to create promo code' });
  }
};

// AD-5: Update promo code
exports.updatePromoCode = async (req, res) => {
  try {
    const { promoId } = req.params;
    const { description, discountType, discountValue, minOrderAmount, maxDiscountAmount, usageLimit, validFrom, validUntil, isActive } = req.body;

    const updatePayload = {};
    if (description !== undefined) updatePayload.description = description;
    if (discountType !== undefined) updatePayload.discount_type = discountType;
    if (discountValue !== undefined) updatePayload.discount_value = discountValue;
    if (minOrderAmount !== undefined) updatePayload.min_order_amount = minOrderAmount;
    if (maxDiscountAmount !== undefined) updatePayload.max_discount_amount = maxDiscountAmount;
    if (usageLimit !== undefined) updatePayload.usage_limit = usageLimit;
    if (validFrom !== undefined) updatePayload.valid_from = validFrom;
    if (validUntil !== undefined) updatePayload.valid_until = validUntil;
    if (isActive !== undefined) updatePayload.is_active = isActive;
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('promo_codes')
      .update(updatePayload)
      .eq('promo_id', promoId)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Promo code not found' });
    res.json({ success: true, message: 'Promo code updated successfully', data });
  } catch (error) {
    console.error('updatePromoCode error:', error);
    res.status(500).json({ success: false, message: 'Failed to update promo code' });
  }
};

// AD-5: Delete promo code
exports.deletePromoCode = async (req, res) => {
  try {
    const { promoId } = req.params;
    const { data, error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('promo_id', promoId)
      .select('promo_id')
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Promo code not found' });
    res.json({ success: true, message: 'Promo code deleted successfully' });
  } catch (error) {
    console.error('deletePromoCode error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete promo code' });
  }
};


