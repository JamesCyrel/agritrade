const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
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

module.exports = router;


