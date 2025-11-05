const express = require('express');
const router = express.Router();
const consumerController = require('../controllers/consumerController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and CONSUMER role
router.use(authenticate, authorize('CONSUMER'));

// Profile
router.get('/profile', consumerController.getProfile);
router.put('/profile', consumerController.updateProfile);

// Addresses
router.get('/addresses', consumerController.getAddresses);
router.post('/addresses', consumerController.addAddress);
router.put('/addresses/:addressId', consumerController.updateAddress);
router.delete('/addresses/:addressId', consumerController.deleteAddress);

// Payment methods
router.get('/payment-methods', consumerController.getPaymentMethods);
router.post('/payment-methods', consumerController.addPaymentMethod);
router.put('/payment-methods/:paymentId', consumerController.updatePaymentMethod);
router.delete('/payment-methods/:paymentId', consumerController.deletePaymentMethod);

// Search & Browsing (SB-1 to SB-5)
router.get('/homepage', consumerController.getHomepage);
// Search route must come before /products/:productId to avoid route conflicts
router.get('/products/search', consumerController.searchProducts);
router.get('/products/:productId', consumerController.getProductDetails);
router.get('/farmers/:farmerId/storefront', consumerController.getFarmerStorefront);

module.exports = router;

