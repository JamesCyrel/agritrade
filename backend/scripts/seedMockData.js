/**
 * Seed script to create mock data for presentation/demo purposes
 * Run with: node scripts/seedMockData.js
 * 
 * This script creates:
 * - 5 verified farmers with Philippine farm names
 * - 8 consumers with Filipino names
 * - 20+ rice products with real images
 * - Consumer addresses and payment methods
 * - Orders in various statuses
 * - Reviews for delivered orders
 * - Promo codes for demo checkout
 * - Notifications and farmer earnings
 */

require('dotenv').config();
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Consumer = require('../models/Consumer');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');

// ============================================================================
// MOCK DATA DEFINITIONS
// ============================================================================

// Default password for all mock users
const DEFAULT_PASSWORD = 'password123';

// Philippine Rice Farmers
const FARMERS = [
  {
    email: 'juan.delacruz@farm.ph',
    phone: '09171234567',
    full_name: 'Juan Dela Cruz',
    farm_name: 'Magat Valley Rice Farm',
    address: 'Brgy. San Jose, Ramon, Isabela',
    latitude: 16.7833,
    longitude: 121.5333,
    bank_name: 'BDO',
    bank_account_number: '1234567890',
    branch_code: '0123'
  },
  {
    email: 'maria.santos@farm.ph',
    phone: '09181234568',
    full_name: 'Maria Santos',
    farm_name: 'Nueva Ecija Golden Grains',
    address: 'Brgy. Malapit, San Isidro, Nueva Ecija',
    latitude: 15.4500,
    longitude: 120.9667,
    bank_name: 'Metrobank',
    bank_account_number: '2345678901',
    branch_code: '0456'
  },
  {
    email: 'pedro.reyes@farm.ph',
    phone: '09191234569',
    full_name: 'Pedro Reyes',
    farm_name: 'Pangasinan Premium Rice',
    address: 'Brgy. Binday, Dagupan City, Pangasinan',
    latitude: 16.0433,
    longitude: 120.3333,
    bank_name: 'BPI',
    bank_account_number: '3456789012',
    branch_code: '0789'
  },
  {
    email: 'elena.garcia@farm.ph',
    phone: '09201234570',
    full_name: 'Elena Garcia',
    farm_name: 'Tarlac Harvest Fields',
    address: 'Brgy. San Vicente, Gerona, Tarlac',
    latitude: 15.6000,
    longitude: 120.6000,
    bank_name: 'Landbank',
    bank_account_number: '4567890123',
    branch_code: '0321'
  },
  {
    email: 'roberto.cruz@farm.ph',
    phone: '09211234571',
    full_name: 'Roberto Cruz',
    farm_name: 'Bulacan Organic Rice Co.',
    address: 'Brgy. Tibig, San Rafael, Bulacan',
    latitude: 14.9500,
    longitude: 120.9500,
    bank_name: 'PNB',
    bank_account_number: '5678901234',
    branch_code: '0654'
  }
];

// Philippine Consumers
const CONSUMERS = [
  {
    email: 'anna.lim@gmail.com',
    phone: '09221234572',
    full_name: 'Anna Lim',
    addresses: [
      { label: 'Home', full_address: '123 Rizal Street, Brgy. San Antonio, Makati City', city: 'Makati City', state: 'Metro Manila', postal_code: '1203', latitude: 14.5547, longitude: 121.0244, is_default: true },
      { label: 'Office', full_address: '45 Ayala Avenue, Makati CBD', city: 'Makati City', state: 'Metro Manila', postal_code: '1226', latitude: 14.5565, longitude: 121.0245, is_default: false }
    ],
    payment_methods: [
      { payment_type: 'WALLET', wallet_provider: 'GCash', is_default: true },
      { payment_type: 'CARD', card_number_last4: '4532', card_holder_name: 'ANNA LIM', card_expiry_month: 12, card_expiry_year: 2026, is_default: false }
    ]
  },
  {
    email: 'mark.tan@yahoo.com',
    phone: '09231234573',
    full_name: 'Mark Tan',
    addresses: [
      { label: 'Home', full_address: '78 P. Tuazon Blvd, Cubao, Quezon City', city: 'Quezon City', state: 'Metro Manila', postal_code: '1109', latitude: 14.6195, longitude: 121.0516, is_default: true }
    ],
    payment_methods: [
      { payment_type: 'WALLET', wallet_provider: 'Maya', is_default: true }
    ]
  },
  {
    email: 'jessica.wong@gmail.com',
    phone: '09241234574',
    full_name: 'Jessica Wong',
    addresses: [
      { label: 'Home', full_address: '56 Congressional Avenue, Project 8, Quezon City', city: 'Quezon City', state: 'Metro Manila', postal_code: '1106', latitude: 14.6677, longitude: 121.0319, is_default: true }
    ],
    payment_methods: [
      { payment_type: 'CARD', card_number_last4: '8901', card_holder_name: 'JESSICA WONG', card_expiry_month: 8, card_expiry_year: 2025, is_default: true }
    ]
  },
  {
    email: 'carlo.rivera@gmail.com',
    phone: '09251234575',
    full_name: 'Carlo Rivera',
    addresses: [
      { label: 'Home', full_address: '234 Shaw Boulevard, Mandaluyong City', city: 'Mandaluyong', state: 'Metro Manila', postal_code: '1550', latitude: 14.5794, longitude: 121.0359, is_default: true }
    ],
    payment_methods: [
      { payment_type: 'WALLET', wallet_provider: 'GCash', is_default: true }
    ]
  },
  {
    email: 'grace.sy@outlook.com',
    phone: '09261234576',
    full_name: 'Grace Sy',
    addresses: [
      { label: 'Condo', full_address: 'Unit 1205, One Bonifacio High Street, BGC, Taguig', city: 'Taguig City', state: 'Metro Manila', postal_code: '1634', latitude: 14.5512, longitude: 121.0481, is_default: true }
    ],
    payment_methods: [
      { payment_type: 'CARD', card_number_last4: '2345', card_holder_name: 'GRACE SY', card_expiry_month: 3, card_expiry_year: 2027, is_default: true },
      { payment_type: 'WALLET', wallet_provider: 'GCash', is_default: false }
    ]
  },
  {
    email: 'michael.go@gmail.com',
    phone: '09271234577',
    full_name: 'Michael Go',
    addresses: [
      { label: 'Home', full_address: '89 Ortigas Avenue, Pasig City', city: 'Pasig City', state: 'Metro Manila', postal_code: '1605', latitude: 14.5876, longitude: 121.0612, is_default: true }
    ],
    payment_methods: [
      { payment_type: 'WALLET', wallet_provider: 'Maya', is_default: true }
    ]
  },
  {
    email: 'patricia.lee@gmail.com',
    phone: '09281234578',
    full_name: 'Patricia Lee',
    addresses: [
      { label: 'Home', full_address: '12 Alabang-Zapote Road, Las Piñas City', city: 'Las Piñas City', state: 'Metro Manila', postal_code: '1740', latitude: 14.4297, longitude: 120.9822, is_default: true }
    ],
    payment_methods: [
      { payment_type: 'WALLET', wallet_provider: 'GCash', is_default: true }
    ]
  },
  {
    email: 'david.chua@gmail.com',
    phone: '09291234579',
    full_name: 'David Chua',
    addresses: [
      { label: 'Home', full_address: '345 España Boulevard, Sampaloc, Manila', city: 'Manila', state: 'Metro Manila', postal_code: '1008', latitude: 14.6042, longitude: 120.9822, is_default: true }
    ],
    payment_methods: [
      { payment_type: 'CARD', card_number_last4: '6789', card_holder_name: 'DAVID CHUA', card_expiry_month: 11, card_expiry_year: 2026, is_default: true }
    ]
  }
];

// Rice Products (will be assigned to farmers)
// Using web-based placeholder images for rice
const RICE_IMAGES = {
  milled: [
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1594671017690-e1c6d5a3f2db?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=400&fit=crop',
  ],
  unmilled: [
    'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1574323347407-f5e1c0c8de8a?w=400&h=400&fit=crop',
  ]
};

const PRODUCTS = [
  // Farmer 1 - Magat Valley Rice Farm (Isabela)
  {
    farmer_index: 0,
    rice_type: 'MILLED',
    variety_name: 'Sinandomeng Premium',
    description: 'Our finest Sinandomeng rice, grown in the fertile Magat Valley. Long grain, aromatic, and perfect for everyday meals. Harvested fresh from our farm.',
    price_per_kg: 52,
    available_quantity: 500,
    images: [RICE_IMAGES.milled[0], RICE_IMAGES.milled[1]],
    sack_sizes: [
      { size_kg: 5, price: 260 },
      { size_kg: 10, price: 510 },
      { size_kg: 25, price: 1250 },
      { size_kg: 50, price: 2450 }
    ]
  },
  {
    farmer_index: 0,
    rice_type: 'MILLED',
    variety_name: 'Dinorado Special',
    description: 'Premium Dinorado rice known for its soft, fluffy texture when cooked. Locally grown with traditional farming methods.',
    price_per_kg: 65,
    available_quantity: 300,
    images: [RICE_IMAGES.milled[2], RICE_IMAGES.milled[3]],
    sack_sizes: [
      { size_kg: 5, price: 325 },
      { size_kg: 10, price: 640 },
      { size_kg: 25, price: 1575 }
    ]
  },
  {
    farmer_index: 0,
    rice_type: 'UNMILLED_PADDY',
    variety_name: 'Isabela Paddy Rice',
    description: 'Fresh paddy rice for those who prefer to mill their own. High quality unmilled rice from Isabela province.',
    price_per_kg: 28,
    available_quantity: 1000,
    images: [RICE_IMAGES.unmilled[0], RICE_IMAGES.unmilled[1]],
    sack_sizes: [
      { size_kg: 25, price: 700 },
      { size_kg: 50, price: 1350 }
    ]
  },
  // Farmer 2 - Nueva Ecija Golden Grains
  {
    farmer_index: 1,
    rice_type: 'MILLED',
    variety_name: 'NFA Quality Rice',
    description: 'Affordable, high-quality rice perfect for families. Grown in the rice granary of the Philippines.',
    price_per_kg: 45,
    available_quantity: 800,
    images: [RICE_IMAGES.milled[1], RICE_IMAGES.milled[0]],
    sack_sizes: [
      { size_kg: 5, price: 225 },
      { size_kg: 10, price: 440 },
      { size_kg: 25, price: 1080 },
      { size_kg: 50, price: 2100 }
    ]
  },
  {
    farmer_index: 1,
    rice_type: 'MILLED',
    variety_name: 'Jasmine Aromatic Rice',
    description: 'Fragrant jasmine rice with a naturally sweet aroma. Perfect for special occasions and Asian cuisine.',
    price_per_kg: 72,
    available_quantity: 250,
    images: [RICE_IMAGES.milled[3], RICE_IMAGES.milled[4]],
    sack_sizes: [
      { size_kg: 5, price: 360 },
      { size_kg: 10, price: 700 },
      { size_kg: 25, price: 1700 }
    ]
  },
  {
    farmer_index: 1,
    rice_type: 'MILLED',
    variety_name: 'Brown Rice Healthy',
    description: 'Nutritious brown rice for health-conscious consumers. Rich in fiber and natural nutrients.',
    price_per_kg: 68,
    available_quantity: 200,
    images: [RICE_IMAGES.milled[2]],
    sack_sizes: [
      { size_kg: 5, price: 340 },
      { size_kg: 10, price: 660 }
    ]
  },
  // Farmer 3 - Pangasinan Premium Rice
  {
    farmer_index: 2,
    rice_type: 'MILLED',
    variety_name: 'Pangasinan Long Grain',
    description: 'Premium long grain rice from the coastal province of Pangasinan. Non-sticky and fluffy when cooked.',
    price_per_kg: 55,
    available_quantity: 600,
    images: [RICE_IMAGES.milled[0], RICE_IMAGES.milled[2]],
    sack_sizes: [
      { size_kg: 5, price: 275 },
      { size_kg: 10, price: 540 },
      { size_kg: 25, price: 1325 },
      { size_kg: 50, price: 2600 }
    ]
  },
  {
    farmer_index: 2,
    rice_type: 'UNMILLED_PADDY',
    variety_name: 'Fresh Harvest Paddy',
    description: 'Just harvested paddy rice. Mill it yourself for the freshest rice experience.',
    price_per_kg: 25,
    available_quantity: 1500,
    images: [RICE_IMAGES.unmilled[2], RICE_IMAGES.unmilled[0]],
    sack_sizes: [
      { size_kg: 25, price: 625 },
      { size_kg: 50, price: 1200 }
    ]
  },
  // Farmer 4 - Tarlac Harvest Fields
  {
    farmer_index: 3,
    rice_type: 'MILLED',
    variety_name: 'Tarlac Malagkit',
    description: 'Sticky rice (malagkit) perfect for traditional Filipino desserts like suman and biko.',
    price_per_kg: 58,
    available_quantity: 350,
    images: [RICE_IMAGES.milled[4], RICE_IMAGES.milled[1]],
    sack_sizes: [
      { size_kg: 5, price: 290 },
      { size_kg: 10, price: 570 }
    ]
  },
  {
    farmer_index: 3,
    rice_type: 'MILLED',
    variety_name: 'RC222 Premium',
    description: 'High-yielding RC222 variety known for its excellent cooking quality and taste.',
    price_per_kg: 48,
    available_quantity: 700,
    images: [RICE_IMAGES.milled[3], RICE_IMAGES.milled[0]],
    sack_sizes: [
      { size_kg: 5, price: 240 },
      { size_kg: 10, price: 470 },
      { size_kg: 25, price: 1150 },
      { size_kg: 50, price: 2250 }
    ]
  },
  {
    farmer_index: 3,
    rice_type: 'UNMILLED_PADDY',
    variety_name: 'Organic Paddy Rice',
    description: 'Certified organic paddy rice grown without chemical fertilizers or pesticides.',
    price_per_kg: 32,
    available_quantity: 400,
    images: [RICE_IMAGES.unmilled[0], RICE_IMAGES.unmilled[1]],
    sack_sizes: [
      { size_kg: 25, price: 800 },
      { size_kg: 50, price: 1550 }
    ]
  },
  // Farmer 5 - Bulacan Organic Rice Co.
  {
    farmer_index: 4,
    rice_type: 'MILLED',
    variety_name: 'Organic White Rice',
    description: '100% certified organic white rice. No chemicals, just pure natural goodness from Bulacan.',
    price_per_kg: 78,
    available_quantity: 200,
    images: [RICE_IMAGES.milled[2], RICE_IMAGES.milled[4]],
    sack_sizes: [
      { size_kg: 5, price: 390 },
      { size_kg: 10, price: 760 }
    ]
  },
  {
    farmer_index: 4,
    rice_type: 'MILLED',
    variety_name: 'Red Rice Premium',
    description: 'Nutritious red rice variety rich in antioxidants. A healthy alternative to white rice.',
    price_per_kg: 85,
    available_quantity: 150,
    images: [RICE_IMAGES.milled[1], RICE_IMAGES.milled[3]],
    sack_sizes: [
      { size_kg: 5, price: 425 },
      { size_kg: 10, price: 830 }
    ]
  },
  {
    farmer_index: 4,
    rice_type: 'MILLED',
    variety_name: 'Black Rice (Tapol)',
    description: 'Traditional black rice variety. Known for its nutty flavor and high nutritional value.',
    price_per_kg: 95,
    available_quantity: 100,
    images: [RICE_IMAGES.milled[0]],
    sack_sizes: [
      { size_kg: 5, price: 475 },
      { size_kg: 10, price: 920 }
    ]
  }
];

// Promo Codes for Demo
const PROMO_CODES = [
  {
    code: 'WELCOME10',
    description: 'Welcome discount for new customers - 10% off first order',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    min_order_amount: 500,
    max_discount_amount: 200,
    usage_limit: 100,
    is_active: true
  },
  {
    code: 'FREEDELIVERY',
    description: 'Free delivery on orders over ₱1000',
    discount_type: 'FIXED',
    discount_value: 50,
    min_order_amount: 1000,
    max_discount_amount: 50,
    usage_limit: 50,
    is_active: true
  },
  {
    code: 'AGRITRADE20',
    description: 'Special AgriTrade promo - 20% off',
    discount_type: 'PERCENTAGE',
    discount_value: 20,
    min_order_amount: 1500,
    max_discount_amount: 500,
    usage_limit: 25,
    is_active: true
  },
  {
    code: 'RICE100',
    description: '₱100 off on orders above ₱2000',
    discount_type: 'FIXED',
    discount_value: 100,
    min_order_amount: 2000,
    max_discount_amount: 100,
    usage_limit: null,
    is_active: true
  },
  {
    code: 'EXPIRED2024',
    description: 'Expired promo code for testing',
    discount_type: 'PERCENTAGE',
    discount_value: 15,
    min_order_amount: 0,
    max_discount_amount: 300,
    usage_limit: 10,
    is_active: false
  }
];

// Reviews for delivered orders
const REVIEW_TEMPLATES = [
  { rating: 5, comment: 'Excellent quality rice! Very fragrant and the grains are perfectly milled. Will definitely order again.' },
  { rating: 5, comment: 'Fast delivery and the rice quality exceeded my expectations. The farmer was very responsive.' },
  { rating: 4, comment: 'Good rice, cooks well and tastes great. Delivery was a bit delayed but overall satisfied.' },
  { rating: 5, comment: 'Best rice I\'ve bought online! Very fresh and you can tell it\'s directly from the farm.' },
  { rating: 4, comment: 'Nice quality rice at a reasonable price. Will recommend to friends and family.' },
  { rating: 5, comment: 'The Jasmine rice smells amazing! Perfect for our family dinners. Thank you!' },
  { rating: 4, comment: 'Good product, fair price. The 25kg sack was well packed and arrived in good condition.' },
  { rating: 5, comment: 'Supporting local farmers and getting premium quality rice. Win-win! Highly recommended.' }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

async function seedFarmers() {
  console.log('\n📝 Creating farmers...');
  const farmerIds = [];
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  for (const farmer of FARMERS) {
    // Check if farmer already exists
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE email = $1 OR phone = $2',
      [farmer.email, farmer.phone]
    );

    let userId;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].user_id;
      console.log(`   ℹ️  Farmer ${farmer.full_name} already exists (ID: ${userId})`);
    } else {
      // Create user
      const userResult = await pool.query(
        `INSERT INTO users (email, phone, password_hash, role)
         VALUES ($1, $2, $3, 'FARMER')
         RETURNING user_id`,
        [farmer.email, farmer.phone, passwordHash]
      );
      userId = userResult.rows[0].user_id;
      console.log(`   ✅ Created farmer: ${farmer.full_name} (ID: ${userId})`);
    }

    // Update or create profile with verification
    await pool.query(
      `INSERT INTO profiles (user_id, full_name, farm_name, address, latitude, longitude, 
                            bank_name, bank_account_number, branch_code, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'APPROVED')
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         farm_name = EXCLUDED.farm_name,
         address = EXCLUDED.address,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         bank_name = EXCLUDED.bank_name,
         bank_account_number = EXCLUDED.bank_account_number,
         branch_code = EXCLUDED.branch_code,
         verification_status = 'APPROVED'`,
      [userId, farmer.full_name, farmer.farm_name, farmer.address, 
       farmer.latitude, farmer.longitude, farmer.bank_name, 
       farmer.bank_account_number, farmer.branch_code]
    );

    farmerIds.push(userId);
  }

  console.log(`   ✅ Total farmers: ${farmerIds.length}`);
  return farmerIds;
}

async function seedConsumers() {
  console.log('\n📝 Creating consumers...');
  const consumerData = [];
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  for (const consumer of CONSUMERS) {
    // Check if consumer already exists
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE email = $1 OR phone = $2',
      [consumer.email, consumer.phone]
    );

    let userId;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].user_id;
      console.log(`   ℹ️  Consumer ${consumer.full_name} already exists (ID: ${userId})`);
    } else {
      // Create user
      const userResult = await pool.query(
        `INSERT INTO users (email, phone, password_hash, role)
         VALUES ($1, $2, $3, 'CONSUMER')
         RETURNING user_id`,
        [consumer.email, consumer.phone, passwordHash]
      );
      userId = userResult.rows[0].user_id;
      console.log(`   ✅ Created consumer: ${consumer.full_name} (ID: ${userId})`);
    }

    // Update profile
    await pool.query(
      `INSERT INTO profiles (user_id, full_name)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name`,
      [userId, consumer.full_name]
    );

    // Create addresses
    const addressIds = [];
    for (const addr of consumer.addresses) {
      const addrResult = await pool.query(
        `INSERT INTO consumer_addresses 
         (user_id, label, full_address, city, state, postal_code, latitude, longitude, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING
         RETURNING address_id`,
        [userId, addr.label, addr.full_address, addr.city, addr.state, 
         addr.postal_code, addr.latitude, addr.longitude, addr.is_default]
      );
      if (addrResult.rows.length > 0) {
        addressIds.push(addrResult.rows[0].address_id);
      }
    }

    // Create payment methods
    const paymentIds = [];
    for (const pm of consumer.payment_methods) {
      const pmResult = await pool.query(
        `INSERT INTO consumer_payment_methods 
         (user_id, payment_type, card_number_last4, card_holder_name, 
          expiry_month, expiry_year, wallet_provider, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING
         RETURNING payment_id`,
        [userId, pm.payment_type, pm.card_number_last4 || null, 
         pm.card_holder_name || null, pm.card_expiry_month || null,
         pm.card_expiry_year || null, pm.wallet_provider || null, pm.is_default]
      );
      if (pmResult.rows.length > 0) {
        paymentIds.push(pmResult.rows[0].payment_id);
      }
    }

    consumerData.push({ 
      userId, 
      addressIds, 
      paymentIds,
      name: consumer.full_name 
    });
  }

  console.log(`   ✅ Total consumers: ${consumerData.length}`);
  return consumerData;
}

async function seedProducts(farmerIds) {
  console.log('\n📝 Creating products...');
  const productIds = [];

  for (const product of PRODUCTS) {
    const farmerId = farmerIds[product.farmer_index];
    
    // Check if similar product exists
    const existingProduct = await pool.query(
      'SELECT product_id FROM products WHERE farmer_id = $1 AND variety_name = $2',
      [farmerId, product.variety_name]
    );

    if (existingProduct.rows.length > 0) {
      console.log(`   ℹ️  Product ${product.variety_name} already exists`);
      productIds.push(existingProduct.rows[0].product_id);
      continue;
    }

    // Create product
    const productResult = await pool.query(
      `INSERT INTO products 
       (farmer_id, rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'KG', 'ACTIVE')
       RETURNING product_id`,
      [farmerId, product.rice_type, product.variety_name, product.description, 
       product.price_per_kg, product.available_quantity]
    );
    
    const productId = productResult.rows[0].product_id;
    productIds.push(productId);

    // Add images (using web URLs)
    for (let i = 0; i < product.images.length; i++) {
      await pool.query(
        `INSERT INTO product_images (product_id, image_url, image_order)
         VALUES ($1, $2, $3)`,
        [productId, product.images[i], i]
      );
    }

    // Add sack sizes
    for (const sack of product.sack_sizes) {
      await pool.query(
        `INSERT INTO product_sack_sizes (product_id, size_kg, price)
         VALUES ($1, $2, $3)`,
        [productId, sack.size_kg, sack.price]
      );
    }

    console.log(`   ✅ Created product: ${product.variety_name} (ID: ${productId})`);
  }

  console.log(`   ✅ Total products: ${productIds.length}`);
  return productIds;
}

async function seedPromoCodes() {
  console.log('\n📝 Creating promo codes...');

  for (const promo of PROMO_CODES) {
    // Check if promo code exists
    const existingPromo = await pool.query(
      'SELECT promo_id FROM promo_codes WHERE code = $1',
      [promo.code]
    );

    if (existingPromo.rows.length > 0) {
      console.log(`   ℹ️  Promo code ${promo.code} already exists`);
      continue;
    }

    // Set validity dates
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 6); // Valid for 6 months

    // For expired promo, set past dates
    if (promo.code === 'EXPIRED2024') {
      validFrom.setFullYear(2024, 0, 1);
      validUntil.setFullYear(2024, 11, 31);
    }

    await pool.query(
      `INSERT INTO promo_codes 
       (code, description, discount_type, discount_value, min_order_amount, 
        max_discount_amount, usage_limit, is_active, valid_from, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [promo.code, promo.description, promo.discount_type, promo.discount_value,
       promo.min_order_amount, promo.max_discount_amount, promo.usage_limit,
       promo.is_active, validFrom, validUntil]
    );

    console.log(`   ✅ Created promo code: ${promo.code} (${promo.discount_type}: ${promo.discount_value})`);
  }
}

async function seedOrders(farmerIds, consumerData, productIds) {
  console.log('\n📝 Creating orders...');
  const orderIds = [];
  
  const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
  
  // Create orders with different statuses
  const ordersToCreate = [
    // Delivered orders (for reviews)
    { consumerIndex: 0, farmerIndex: 0, status: 'DELIVERED', daysAgo: 15 },
    { consumerIndex: 1, farmerIndex: 1, status: 'DELIVERED', daysAgo: 12 },
    { consumerIndex: 2, farmerIndex: 2, status: 'DELIVERED', daysAgo: 10 },
    { consumerIndex: 3, farmerIndex: 3, status: 'DELIVERED', daysAgo: 8 },
    { consumerIndex: 4, farmerIndex: 4, status: 'DELIVERED', daysAgo: 5 },
    { consumerIndex: 5, farmerIndex: 0, status: 'DELIVERED', daysAgo: 3 },
    { consumerIndex: 0, farmerIndex: 1, status: 'DELIVERED', daysAgo: 2 },
    // Out for delivery
    { consumerIndex: 6, farmerIndex: 1, status: 'OUT_FOR_DELIVERY', daysAgo: 0 },
    { consumerIndex: 7, farmerIndex: 2, status: 'OUT_FOR_DELIVERY', daysAgo: 0 },
    // Preparing
    { consumerIndex: 1, farmerIndex: 3, status: 'PREPARING', daysAgo: 0 },
    { consumerIndex: 2, farmerIndex: 4, status: 'PREPARING', daysAgo: 1 },
    // Confirmed
    { consumerIndex: 3, farmerIndex: 0, status: 'CONFIRMED', daysAgo: 0 },
    { consumerIndex: 4, farmerIndex: 1, status: 'CONFIRMED', daysAgo: 0 },
    // Pending
    { consumerIndex: 5, farmerIndex: 2, status: 'PENDING', daysAgo: 0 },
    { consumerIndex: 6, farmerIndex: 3, status: 'PENDING', daysAgo: 0 },
    { consumerIndex: 7, farmerIndex: 4, status: 'PENDING', daysAgo: 0 },
    // Cancelled
    { consumerIndex: 0, farmerIndex: 2, status: 'CANCELLED', daysAgo: 7 },
    { consumerIndex: 1, farmerIndex: 4, status: 'CANCELLED', daysAgo: 14 }
  ];

  for (const orderSpec of ordersToCreate) {
    const consumer = consumerData[orderSpec.consumerIndex];
    const farmerId = farmerIds[orderSpec.farmerIndex];
    
    // Get products for this farmer
    const farmerProducts = await pool.query(
      `SELECT product_id, variety_name, price_per_kg FROM products 
       WHERE farmer_id = $1 AND status = 'ACTIVE' LIMIT 2`,
      [farmerId]
    );

    if (farmerProducts.rows.length === 0) continue;

    // Calculate order totals
    let subtotal = 0;
    const orderItems = [];
    
    for (const product of farmerProducts.rows) {
      const quantity = Math.floor(Math.random() * 20) + 5; // 5-25 kg
      const itemSubtotal = quantity * product.price_per_kg;
      subtotal += itemSubtotal;
      orderItems.push({
        product_id: product.product_id,
        quantity,
        unit_price: product.price_per_kg,
        subtotal: itemSubtotal
      });
    }

    const deliveryFee = 50;
    const tax = subtotal * 0.12;
    const totalAmount = subtotal + deliveryFee + tax;

    // Set order date
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - orderSpec.daysAgo);

    const orderNumber = generateOrderNumber();
    const addressId = consumer.addressIds.length > 0 ? consumer.addressIds[0] : null;
    const paymentId = consumer.paymentIds.length > 0 ? consumer.paymentIds[0] : null;

    // Create order
    const orderResult = await pool.query(
      `INSERT INTO orders 
       (consumer_id, farmer_id, order_number, status, delivery_address_id, payment_method_id,
        payment_type, subtotal, delivery_fee, tax, total_amount, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
       RETURNING order_id`,
      [consumer.userId, farmerId, orderNumber, orderSpec.status, addressId, paymentId,
       Math.random() > 0.5 ? 'COD' : 'DIGITAL', subtotal, deliveryFee, tax, totalAmount, orderDate]
    );

    const orderId = orderResult.rows[0].order_id;
    orderIds.push({ orderId, status: orderSpec.status, consumerId: consumer.userId, farmerId });

    // Create order items
    for (const item of orderItems) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.quantity, item.unit_price, item.subtotal]
      );
    }

    console.log(`   ✅ Created order: ${orderNumber} (${orderSpec.status})`);
  }

  console.log(`   ✅ Total orders: ${orderIds.length}`);
  return orderIds;
}

async function seedReviews(orders) {
  console.log('\n📝 Creating reviews for delivered orders...');
  
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
  let reviewCount = 0;

  for (const order of deliveredOrders) {
    // Check if review exists
    const existingReview = await pool.query(
      'SELECT review_id FROM reviews WHERE order_id = $1',
      [order.orderId]
    );

    if (existingReview.rows.length > 0) {
      console.log(`   ℹ️  Review for order ${order.orderId} already exists`);
      continue;
    }

    // Get a product from the order
    const productResult = await pool.query(
      'SELECT product_id FROM order_items WHERE order_id = $1 LIMIT 1',
      [order.orderId]
    );

    const productId = productResult.rows.length > 0 ? productResult.rows[0].product_id : null;

    // Random review
    const review = randomElement(REVIEW_TEMPLATES);

    await pool.query(
      `INSERT INTO reviews (order_id, consumer_id, farmer_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [order.orderId, order.consumerId, order.farmerId, productId, review.rating, review.comment]
    );

    reviewCount++;
    console.log(`   ✅ Created review for order ${order.orderId} (${review.rating} stars)`);
  }

  console.log(`   ✅ Total reviews: ${reviewCount}`);
}

async function seedNotifications(orders, farmerIds, consumerData) {
  console.log('\n📝 Creating notifications...');
  
  let notificationCount = 0;

  // Create notifications for orders
  for (const order of orders) {
    // Notification for consumer
    await pool.query(
      `INSERT INTO notifications (user_id, order_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [order.consumerId, order.orderId, 'ORDER_STATUS', 
       `Order ${order.status.replace('_', ' ')}`,
       `Your order has been updated to ${order.status.toLowerCase().replace('_', ' ')}`]
    );
    notificationCount++;

    // Notification for farmer
    await pool.query(
      `INSERT INTO notifications (user_id, order_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [order.farmerId, order.orderId, 'NEW_ORDER',
       'New Order Received',
       `You have received a new order. Status: ${order.status.toLowerCase().replace('_', ' ')}`]
    );
    notificationCount++;
  }

  console.log(`   ✅ Total notifications: ${notificationCount}`);
}

async function seedFarmerEarnings(orders, farmerIds) {
  console.log('\n📝 Creating farmer earnings records...');
  
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
  let ledgerCount = 0;

  for (const order of deliveredOrders) {
    // Get order total
    const orderResult = await pool.query(
      'SELECT total_amount FROM orders WHERE order_id = $1',
      [order.orderId]
    );

    if (orderResult.rows.length === 0) continue;

    const totalAmount = parseFloat(orderResult.rows[0].total_amount);
    const commissionRate = 0.05;
    const commission = totalAmount * commissionRate;
    const earning = totalAmount - commission;

    // Check if ledger entry exists
    const existingLedger = await pool.query(
      'SELECT ledger_id FROM farmer_ledger WHERE order_id = $1 AND farmer_id = $2',
      [order.orderId, order.farmerId]
    );

    if (existingLedger.rows.length > 0) continue;

    // Get current balance
    const balanceResult = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'EARNING' THEN amount 
                          WHEN transaction_type = 'PAYOUT' THEN -amount 
                          ELSE 0 END), 0) as balance
       FROM farmer_ledger WHERE farmer_id = $1`,
      [order.farmerId]
    );
    const currentBalance = parseFloat(balanceResult.rows[0].balance || 0);

    // Create earning entry
    await pool.query(
      `INSERT INTO farmer_ledger (farmer_id, order_id, transaction_type, amount, balance_before, balance_after, description)
       VALUES ($1, $2, 'EARNING', $3, $4, $5, $6)`,
      [order.farmerId, order.orderId, earning, currentBalance, currentBalance + earning,
       `Earnings from order #${order.orderId}`]
    );

    // Create commission entry
    await pool.query(
      `INSERT INTO farmer_ledger (farmer_id, order_id, transaction_type, amount, balance_before, balance_after, description)
       VALUES ($1, $2, 'COMMISSION', $3, $4, $5, $6)`,
      [order.farmerId, order.orderId, commission, currentBalance + earning, currentBalance + earning,
       `Platform commission (5%) for order #${order.orderId}`]
    );

    ledgerCount += 2;
  }

  console.log(`   ✅ Total ledger entries: ${ledgerCount}`);
}

async function seedFavorites(consumerData, productIds) {
  console.log('\n📝 Creating favorites...');
  
  let favoriteCount = 0;

  for (const consumer of consumerData) {
    // Each consumer favorites 2-4 random products
    const numFavorites = Math.floor(Math.random() * 3) + 2;
    const shuffledProducts = [...productIds].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(numFavorites, shuffledProducts.length); i++) {
      const productId = shuffledProducts[i];
      
      await pool.query(
        `INSERT INTO consumer_favorites (user_id, product_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, product_id) DO NOTHING`,
        [consumer.userId, productId]
      );
      favoriteCount++;
    }
  }

  console.log(`   ✅ Total favorites: ${favoriteCount}`);
}

async function seedCartItems(consumerData, productIds) {
  console.log('\n📝 Creating cart items...');
  
  let cartCount = 0;

  // Add cart items for first 3 consumers
  for (let i = 0; i < Math.min(3, consumerData.length); i++) {
    const consumer = consumerData[i];
    const numItems = Math.floor(Math.random() * 2) + 1;
    const shuffledProducts = [...productIds].sort(() => Math.random() - 0.5);
    
    for (let j = 0; j < numItems; j++) {
      const productId = shuffledProducts[j];
      
      // Get product details
      const productResult = await pool.query(
        'SELECT price_per_kg FROM products WHERE product_id = $1',
        [productId]
      );
      
      if (productResult.rows.length === 0) continue;
      
      const quantity = (Math.floor(Math.random() * 4) + 1) * 5; // 5, 10, 15, or 20 kg
      const unitPrice = productResult.rows[0].price_per_kg;
      
      await pool.query(
        `INSERT INTO cart_items (user_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, product_id, sack_size_kg) DO UPDATE SET
           quantity = EXCLUDED.quantity,
           unit_price = EXCLUDED.unit_price`,
        [consumer.userId, productId, quantity, unitPrice]
      );
      cartCount++;
    }
  }

  console.log(`   ✅ Total cart items: ${cartCount}`);
}

async function seedFeaturedFarmers(farmerIds) {
  console.log('\n📝 Setting up featured farmers...');
  
  // Feature top 3 farmers
  for (let i = 0; i < Math.min(3, farmerIds.length); i++) {
    await pool.query(
      `INSERT INTO featured_farmers (farmer_id, display_order, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (farmer_id) DO UPDATE SET display_order = EXCLUDED.display_order, is_active = true`,
      [farmerIds[i], i + 1]
    );
    console.log(`   ✅ Featured farmer ID: ${farmerIds[i]} (order: ${i + 1})`);
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function seedMockData() {
  console.log('================================================================================');
  console.log('                    🌱 AGRITRADE MOCK DATA SEEDER');
  console.log('================================================================================');
  console.log(`Started at: ${new Date().toLocaleString()}`);
  console.log('');

  try {
    // Ensure all tables exist
    console.log('📋 Verifying database tables...');
    await User.createTable();
    await Product.createTable();
    await Order.createTable();
    await Consumer.createTables();
    
    // Create additional tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        review_id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        consumer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, consumer_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        notification_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS farmer_ledger (
        ledger_id SERIAL PRIMARY KEY,
        farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('EARNING', 'COMMISSION', 'PAYOUT', 'REFUND', 'COD_FEE')),
        amount DECIMAL(10, 2) NOT NULL,
        balance_before DECIMAL(10, 2) NOT NULL,
        balance_after DECIMAL(10, 2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS featured_farmers (
        feature_id SERIAL PRIMARY KEY,
        farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE UNIQUE,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS consumer_favorites (
        favorite_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      );
    `);
    console.log('✅ All tables verified');

    // Seed data in dependency order
    const farmerIds = await seedFarmers();
    const consumerData = await seedConsumers();
    const productIds = await seedProducts(farmerIds);
    await seedPromoCodes();
    const orders = await seedOrders(farmerIds, consumerData, productIds);
    await seedReviews(orders);
    await seedNotifications(orders, farmerIds, consumerData);
    await seedFarmerEarnings(orders, farmerIds);
    await seedFavorites(consumerData, productIds);
    await seedCartItems(consumerData, productIds);
    await seedFeaturedFarmers(farmerIds);

    // Print summary
    console.log('\n================================================================================');
    console.log('                    ✅ MOCK DATA SEEDING COMPLETE');
    console.log('================================================================================');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Farmers: ${farmerIds.length} (all verified & approved)`);
    console.log(`   • Consumers: ${consumerData.length} (with addresses & payment methods)`);
    console.log(`   • Products: ${productIds.length} (with images & sack sizes)`);
    console.log(`   • Orders: ${orders.length} (various statuses)`);
    console.log(`   • Promo Codes: ${PROMO_CODES.length}`);
    console.log('');
    console.log('🔐 Login Credentials (all users):');
    console.log(`   Password: ${DEFAULT_PASSWORD}`);
    console.log('');
    console.log('👨‍🌾 Sample Farmer Logins:');
    console.log('   • Email: juan.delacruz@farm.ph');
    console.log('   • Email: maria.santos@farm.ph');
    console.log('');
    console.log('🛒 Sample Consumer Logins:');
    console.log('   • Email: anna.lim@gmail.com');
    console.log('   • Email: mark.tan@yahoo.com');
    console.log('');
    console.log('🎟️ Available Promo Codes:');
    for (const promo of PROMO_CODES.filter(p => p.is_active)) {
      console.log(`   • ${promo.code}: ${promo.description}`);
    }
    console.log('');
    console.log('================================================================================');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding mock data:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the seeder
seedMockData();
