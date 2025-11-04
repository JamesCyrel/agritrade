const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmerController');
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

module.exports = router;


