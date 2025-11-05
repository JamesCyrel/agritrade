const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes admin-only
router.use(authenticate, authorize('ADMIN'));

// List pending applications
router.get('/verifications/pending', adminController.listPendingFarmers);

// Get farmer application detail
router.get('/verifications/:userId', adminController.getFarmerApplication);

// Approve
router.post('/verifications/:userId/approve', adminController.approveFarmer);

// Reject
router.post('/verifications/:userId/reject', adminController.rejectFarmer);

// AD-1: User Management
router.get('/users', adminController.listUsers);
router.get('/users/:userId', adminController.getUserProfile);
router.post('/users/:userId/suspend', adminController.suspendUser);
router.post('/users/:userId/activate', adminController.activateUser);

// AD-2: Order Monitoring
router.get('/orders', adminController.getAllOrders);
router.get('/orders/:orderId', adminController.getOrderDetails);

// AD-3: Transaction Monitoring
router.get('/transactions', adminController.getAllTransactions);
router.post('/transactions/:transactionId/refund', adminController.processRefund);
router.get('/payouts', adminController.getAllPayouts);

// AD-4: Dispute Resolution
router.get('/disputes', adminController.getAllDisputes);
router.get('/disputes/:disputeId', adminController.getDisputeDetails);
router.put('/disputes/:disputeId', adminController.updateDispute);

// AD-5: Content Management
router.get('/featured-farmers', adminController.getFeaturedFarmers);
router.post('/featured-farmers', adminController.addFeaturedFarmer);
router.delete('/featured-farmers/:farmerId', adminController.removeFeaturedFarmer);
router.get('/promo-codes', adminController.getAllPromoCodes);
router.post('/promo-codes', adminController.createPromoCode);
router.put('/promo-codes/:promoId', adminController.updatePromoCode);
router.delete('/promo-codes/:promoId', adminController.deletePromoCode);

// AD-6: Analytics & Reporting
router.get('/analytics', adminController.getAnalytics);

// Delivery Fee Settings (OM-7)
router.get('/delivery-fee-settings', notificationController.getDeliveryFeeSettings);
router.put('/delivery-fee-settings', notificationController.updateDeliveryFeeSettings);

module.exports = router;


