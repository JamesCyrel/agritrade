const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and FARMER role
router.use(authenticate, authorize('FARMER'));

// Product CRUD - base routes first
router.post('/products', productController.createProduct);
router.get('/products', productController.getProducts);

// Archive management - specific routes must come BEFORE parameterized routes
router.get('/products/archived/list', productController.getArchivedProducts);

// Product by ID routes - parameterized routes come after specific routes
router.get('/products/:productId', productController.getProduct);
router.put('/products/:productId', productController.updateProduct);
// Archive/unarchive routes with :productId parameter
router.post('/products/:productId/archive', productController.archiveProduct);
router.post('/products/:productId/unarchive', productController.unarchiveProduct);

// Inventory management
router.put('/products/:productId/inventory', productController.updateInventory);

module.exports = router;

