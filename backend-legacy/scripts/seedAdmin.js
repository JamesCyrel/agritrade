/**
 * Seed script to create default admin account
 * Run with: node scripts/seedAdmin.js
 */

require('dotenv').config();
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const ADMIN_EMAIL = 'admin@agritrade.com';
const ADMIN_PASSWORD = 'admin123';

async function seedAdmin() {
  try {
    console.log('🌱 Starting admin seed...');

    // Ensure tables exist
    await User.createTable();
    console.log('✅ Tables verified');

    // Check if admin already exists
    const existingAdmin = await User.findByEmailOrPhone(ADMIN_EMAIL, null);
    
    if (existingAdmin) {
      console.log(`ℹ️  Admin account already exists with email: ${ADMIN_EMAIL}`);
      console.log('   Skipping admin creation.');
      process.exit(0);
    }

    // Create admin user
    console.log(`📝 Creating admin account...`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);

    const adminUser = await User.create({
      email: ADMIN_EMAIL,
      phone: null,
      password: ADMIN_PASSWORD,
      role: 'ADMIN'
    });

    console.log(`✅ Admin account created successfully!`);
    console.log(`   User ID: ${adminUser.user_id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log('\n🔐 You can now login with:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    
    if (error.message === 'Email already exists') {
      console.log('ℹ️  Admin account already exists. Skipping...');
      process.exit(0);
    }
    
    process.exit(1);
  }
}

// Run the seed
seedAdmin();

