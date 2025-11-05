const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/database');
const User = require('./models/User');
const Consumer = require('./models/Consumer');
const Product = require('./models/Product');
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
    await Consumer.createTables();
    await Product.createTable();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
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

