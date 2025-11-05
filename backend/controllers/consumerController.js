const Consumer = require('../models/Consumer');

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

