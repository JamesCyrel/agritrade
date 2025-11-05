const Consumer = require('../models/Consumer');
const Product = require('../models/Product');

// Get profile
exports.getProfile = async (req, res) => {
  try {
    const profile = await Consumer.getProfile(req.user.userId);
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

// Update profile (full_name)
exports.updateProfile = async (req, res) => {
  try {
    const { full_name } = req.body;
    if (!full_name) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }
    const profile = await Consumer.updateProfile(req.user.userId, full_name);
    res.json({ success: true, message: 'Profile updated', data: profile });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// Addresses
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Consumer.getAddresses(req.user.userId);
    res.json({ success: true, data: addresses });
  } catch (error) {
    console.error('getAddresses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch addresses' });
  }
};

exports.addAddress = async (req, res) => {
  try {
    const { label, full_address, city, state, postal_code, is_default } = req.body;
    if (!full_address) {
      return res.status(400).json({ success: false, message: 'Full address is required' });
    }
    const address = await Consumer.addAddress(req.user.userId, {
      label, full_address, city, state, postal_code, is_default
    });
    res.json({ success: true, message: 'Address added', data: address });
  } catch (error) {
    console.error('addAddress error:', error);
    res.status(500).json({ success: false, message: 'Failed to add address' });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, full_address, city, state, postal_code, is_default } = req.body;
    if (!full_address) {
      return res.status(400).json({ success: false, message: 'Full address is required' });
    }
    const address = await Consumer.updateAddress(req.user.userId, addressId, {
      label, full_address, city, state, postal_code, is_default
    });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }
    res.json({ success: true, message: 'Address updated', data: address });
  } catch (error) {
    console.error('updateAddress error:', error);
    res.status(500).json({ success: false, message: 'Failed to update address' });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const address = await Consumer.deleteAddress(req.user.userId, addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }
    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    console.error('deleteAddress error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete address' });
  }
};

// Payment methods
exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = await Consumer.getPaymentMethods(req.user.userId);
    res.json({ success: true, data: methods });
  } catch (error) {
    console.error('getPaymentMethods error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment methods' });
  }
};

exports.addPaymentMethod = async (req, res) => {
  try {
    const { payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default } = req.body;
    if (!payment_type || !['CARD', 'WALLET', 'UPI'].includes(payment_type)) {
      return res.status(400).json({ success: false, message: 'Valid payment type is required' });
    }
    const method = await Consumer.addPaymentMethod(req.user.userId, {
      payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default
    });
    res.json({ success: true, message: 'Payment method added', data: method });
  } catch (error) {
    console.error('addPaymentMethod error:', error);
    res.status(500).json({ success: false, message: 'Failed to add payment method' });
  }
};

exports.updatePaymentMethod = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default } = req.body;
    if (!payment_type || !['CARD', 'WALLET', 'UPI'].includes(payment_type)) {
      return res.status(400).json({ success: false, message: 'Valid payment type is required' });
    }
    const method = await Consumer.updatePaymentMethod(req.user.userId, paymentId, {
      payment_type, card_number_last4, card_holder_name, expiry_month, expiry_year, upi_id, wallet_provider, is_default
    });
    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment method not found' });
    }
    res.json({ success: true, message: 'Payment method updated', data: method });
  } catch (error) {
    console.error('updatePaymentMethod error:', error);
    res.status(500).json({ success: false, message: 'Failed to update payment method' });
  }
};

exports.deletePaymentMethod = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const method = await Consumer.deletePaymentMethod(req.user.userId, paymentId);
    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment method not found' });
    }
    res.json({ success: true, message: 'Payment method deleted' });
  } catch (error) {
    console.error('deletePaymentMethod error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete payment method' });
  }
};

// ===== SEARCH & BROWSING (SB-1 to SB-5) =====

// SB-1: Get homepage data (Featured Farmers, Popular Varieties, New Arrivals)
exports.getHomepage = async (req, res) => {
  try {
    const data = await Product.getHomepageData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('getHomepage error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch homepage data' });
  }
};

// SB-2, SB-3: Search products with filters and sorting
exports.searchProducts = async (req, res) => {
  try {
    const {
      q: searchQuery,
      rice_type: riceType,
      min_price: minPrice,
      max_price: maxPrice,
      max_distance: maxDistance,
      min_rating: minRating,
      sort_by: sortBy,
      limit,
      offset,
    } = req.query;

    // Get consumer location if available (from profile or request)
    // For now, we'll get it from query params, but ideally from consumer's saved address
    const { consumer_lat, consumer_lng } = req.query;

    const searchParams = {
      searchQuery: searchQuery || '',
      riceType,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      maxDistance: maxDistance ? parseFloat(maxDistance) : null,
      consumerLat: consumer_lat ? parseFloat(consumer_lat) : null,
      consumerLng: consumer_lng ? parseFloat(consumer_lng) : null,
      minRating: minRating ? parseFloat(minRating) : null,
      sortBy: sortBy || 'newest',
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    };

    const products = await Product.searchProducts(searchParams);
    res.json({ success: true, data: products, count: products.length });
  } catch (error) {
    console.error('searchProducts error:', error);
    res.status(500).json({ success: false, message: 'Failed to search products' });
  }
};

// SB-4: Get product details with farmer info
exports.getProductDetails = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId || productId === 'undefined') {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }
    const product = await Product.getProductDetailsForConsumer(parseInt(productId));
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('getProductDetails error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product details' });
  }
};

// SB-5: Get farmer storefront
exports.getFarmerStorefront = async (req, res) => {
  try {
    const { farmerId } = req.params;
    if (!farmerId || farmerId === 'undefined' || isNaN(parseInt(farmerId))) {
      return res.status(400).json({ success: false, message: 'Farmer ID is required' });
    }
    const parsedFarmerId = parseInt(farmerId);
    const storefront = await Product.getFarmerStorefront(parsedFarmerId);
    if (!storefront) {
      return res.status(404).json({ success: false, message: 'Farmer not found or not verified' });
    }
    res.json({ success: true, data: storefront });
  } catch (error) {
    console.error('getFarmerStorefront error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch farmer storefront' });
  }
};

