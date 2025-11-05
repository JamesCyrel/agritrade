const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmerController');
const paymentController = require('../controllers/paymentController');
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

module.exports = router;


