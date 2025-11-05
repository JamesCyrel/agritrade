const express = require('express');
const router = express.Router();
const consumerController = require('../controllers/consumerController');
const cartController = require('../controllers/cartController');
const orderController = require('../controllers/orderController');
const paymentController = require('../controllers/paymentController');
const notificationController = require('../controllers/notificationController');
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

// Cart (OC-1, OC-2)
router.post('/cart', cartController.addToCart);
router.get('/cart', cartController.getCart);
router.put('/cart/:cartItemId', cartController.updateCartItem);
router.delete('/cart/:cartItemId', cartController.removeCartItem);
router.delete('/cart', cartController.clearCart);

// Orders & Checkout (OC-3, OC-4)
router.post('/orders', orderController.createOrder);
router.get('/orders', orderController.getConsumerOrders);
router.get('/orders/:orderId', orderController.getOrderDetails);
router.post('/orders/:orderId/cancel', orderController.cancelOrder);
router.post('/promo-codes/validate', orderController.validatePromoCode);

// Payment System (PS-1, PS-2)
router.post('/payments/process', paymentController.processDigitalPayment);
router.post('/payments/cod/check-eligibility', paymentController.checkCODEligibility);
router.post('/payments/cod/process', paymentController.processCODOrder);

// Notifications (OM-6)
router.get('/notifications', notificationController.getNotifications);
router.put('/notifications/:notificationId/read', notificationController.markAsRead);
router.put('/notifications/read-all', notificationController.markAllAsRead);
router.get('/notifications/unread-count', notificationController.getUnreadCount);

module.exports = router;

