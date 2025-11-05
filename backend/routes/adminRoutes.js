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

// List users (optional filters: ?role=FARMER&status=PENDING_REVIEW)
router.get('/users', adminController.listUsers);

// Delivery Fee Settings (OM-7)
router.get('/delivery-fee-settings', notificationController.getDeliveryFeeSettings);
router.put('/delivery-fee-settings', notificationController.updateDeliveryFeeSettings);

module.exports = router;


