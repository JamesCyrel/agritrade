const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmerController');
const paymentController = require('../controllers/paymentController');
const farmerOrderController = require('../controllers/farmerOrderController');
const farmerReviewController = require('../controllers/farmerReviewController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and FARMER role
router.use(authenticate, authorize('FARMER'));

// GET profile
router.get('/profile', farmerController.getProfile);

// PUT profile (complete/update)
router.put('/profile', farmerController.updateProfile);

// POST upload verification documents
router.post('/verification/documents', farmerController.uploadDocuments);

// GET verification status
router.get('/verification/status', farmerController.getVerificationStatus);

// Payment System (PS-2, PS-3)
router.get('/cod/settings', paymentController.getCODSettings);
router.put('/cod/settings', paymentController.updateCODSettings);
router.post('/payments/cod/confirm', paymentController.confirmCODPayment);
router.get('/ledger', paymentController.getFarmerLedger);
router.get('/payouts', paymentController.getFarmerPayouts);
router.post('/payouts/request', paymentController.requestPayout);

// Order Management (OM-2, OM-3, OM-4)
router.get('/orders', farmerOrderController.getFarmerOrders);
router.get('/orders/:orderId', farmerOrderController.getFarmerOrderDetails);
router.post('/orders/:orderId/accept', farmerOrderController.acceptOrder);
router.post('/orders/:orderId/reject', farmerOrderController.rejectOrder);
router.put('/orders/:orderId/status', farmerOrderController.updateOrderStatus);

// Reviews & Ratings (RR-3)
router.get('/reviews', farmerReviewController.getFarmerReviews);

module.exports = router;


