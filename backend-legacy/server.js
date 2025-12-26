const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./config/database');
const User = require('./models/User');
const Consumer = require('./models/Consumer');
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const Order = require('./models/Order');
const Payment = require('./models/Payment');
const Notification = require('./models/Notification');
const Review = require('./models/Review');
const Dispute = require('./models/Dispute');
const HomepageContent = require('./models/HomepageContent');
const authRoutes = require('./routes/authRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const consumerRoutes = require('./routes/consumerRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the assets folder
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Health check route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AgriTrade API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/farmer', productRoutes); // Product routes under /api/farmer
app.use('/api/admin', adminRoutes);
app.use('/api/consumer', consumerRoutes);

// Initialize database tables
const initializeDatabase = async () => {
  try {
    await User.createTable();
    // Ensure products table exists before any consumer tables that reference it
    await Product.createTable();
    await Consumer.createTables();
    await Cart.createTable();
    await Order.createTable();
    await Payment.createTable();
    await Notification.createTable();
    await Review.createTable();
    await Dispute.createTable();
    await HomepageContent.createTable();
    console.log('✅ Database initialized successfully');
    
    // Seed admin account if it doesn't exist
    await seedAdminAccount();
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    process.exit(1);
  }
};

// Seed default admin account
const seedAdminAccount = async () => {
  try {
    const User = require('./models/User');
    const bcrypt = require('bcrypt');
    
    const ADMIN_EMAIL = 'admin@agritrade.com';
    const ADMIN_PASSWORD = 'admin123';
    
    // Check if admin already exists
    const existingAdmin = await User.findByEmailOrPhone(ADMIN_EMAIL, null);
    
    if (existingAdmin) {
      console.log('ℹ️  Admin account already exists');
      return;
    }

    // Create admin user
    const adminUser = await User.create({
      email: ADMIN_EMAIL,
      phone: null,
      password: ADMIN_PASSWORD,
      role: 'ADMIN'
    });

    console.log('✅ Default admin account created');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    // Don't fail server startup if admin already exists
    if (error.message === 'Email already exists') {
      console.log('ℹ️  Admin account already exists');
      return;
    }
    console.error('⚠️  Warning: Could not create admin account:', error.message);
    // Don't exit - this is not critical for server startup
  }
};

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();

    // Start listening on all interfaces for LAN access (Expo physical devices)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
      console.log(`📝 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`🔐 Auth endpoints:`);
      console.log(`   POST /api/auth/signup`);
      console.log(`   POST /api/auth/login`);
      console.log(`   GET  /api/auth/verify`);
      console.log(`
🔧 Farmer endpoints:`);
      console.log(`   GET  /api/farmer/profile`);
      console.log(`   PUT  /api/farmer/profile`);
      console.log(`   POST /api/farmer/verification/documents`);
      console.log(`   GET  /api/farmer/verification/status`);
      console.log(`   POST /api/farmer/products`);
      console.log(`   GET  /api/farmer/products`);
      console.log(`   GET  /api/farmer/products/:productId`);
      console.log(`   PUT  /api/farmer/products/:productId`);
      console.log(`   POST /api/farmer/products/:productId/archive`);
      console.log(`   GET  /api/farmer/products/archived/list`);
      console.log(`   POST /api/farmer/products/:productId/unarchive`);
      console.log(`   PUT  /api/farmer/products/:productId/inventory`);
      console.log(`\n🛡️ Admin endpoints:`);
      console.log(`   GET  /api/admin/verifications/pending`);
      console.log(`   GET  /api/admin/verifications/:userId`);
      console.log(`   POST /api/admin/verifications/:userId/approve`);
      console.log(`   POST /api/admin/verifications/:userId/reject`);
      console.log(`\n🛒 Consumer endpoints:`);
      console.log(`   GET  /api/consumer/profile`);
      console.log(`   PUT  /api/consumer/profile`);
      console.log(`   GET  /api/consumer/addresses`);
      console.log(`   POST /api/consumer/addresses`);
      console.log(`   PUT  /api/consumer/addresses/:addressId`);
      console.log(`   DELETE /api/consumer/addresses/:addressId`);
      console.log(`   GET  /api/consumer/payment-methods`);
      console.log(`   POST /api/consumer/payment-methods`);
      console.log(`   PUT  /api/consumer/payment-methods/:paymentId`);
      console.log(`   DELETE /api/consumer/payment-methods/:paymentId`);
      console.log(`\n🔍 Consumer Browsing endpoints:`);
      console.log(`   GET  /api/consumer/homepage`);
      console.log(`   GET  /api/consumer/products/search`);
      console.log(`   GET  /api/consumer/products/:productId`);
      console.log(`   GET  /api/consumer/farmers/:farmerId/storefront`);
      console.log(`\n🛒 Cart & Orders endpoints:`);
      console.log(`   POST /api/consumer/cart`);
      console.log(`   GET  /api/consumer/cart`);
      console.log(`   PUT  /api/consumer/cart/:cartItemId`);
      console.log(`   DELETE /api/consumer/cart/:cartItemId`);
      console.log(`   DELETE /api/consumer/cart`);
      console.log(`   POST /api/consumer/orders`);
      console.log(`   GET  /api/consumer/orders`);
      console.log(`   GET  /api/consumer/orders/:orderId`);
      console.log(`   POST /api/consumer/promo-codes/validate`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;

