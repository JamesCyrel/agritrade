-- AgriTrade Database Schema
-- Complete schema for all 27 tables

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS promo_codes CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS order_rejections CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS featured_farmers CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS farmer_payouts CASCADE;
DROP TABLE IF EXISTS farmer_ledger CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS delivery_fee_settings CASCADE;
DROP TABLE IF EXISTS consumer_payment_methods CASCADE;
DROP TABLE IF EXISTS consumer_favorites CASCADE;
DROP TABLE IF EXISTS commission_settings CASCADE;
DROP TABLE IF EXISTS cod_settings CASCADE;
DROP TABLE IF EXISTS cod_eligibility CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS consumer_addresses CASCADE;
DROP TABLE IF EXISTS product_sack_sizes CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS verification_documents CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================
-- CORE TABLES
-- =============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('CONSUMER', 'FARMER', 'ADMIN')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  profile_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  farm_name VARCHAR(255),
  address TEXT,
  bank_account_number VARCHAR(50),
  bank_name VARCHAR(100),
  branch_code VARCHAR(20),
  verification_status VARCHAR(20) DEFAULT 'PENDING_DOCUMENTS' CHECK (verification_status IN ('PENDING_DOCUMENTS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')),
  verification_reason TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_user_id ON profiles(user_id);

-- Verification Documents Table
CREATE TABLE IF NOT EXISTS verification_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL,
  file_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ver_docs_user ON verification_documents(user_id);

-- =============================================
-- PRODUCTS AND INVENTORY
-- =============================================

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  product_id SERIAL PRIMARY KEY,
  farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  rice_type VARCHAR(20) NOT NULL CHECK (rice_type IN ('MILLED', 'UNMILLED_PADDY')),
  variety_name VARCHAR(255) NOT NULL,
  description TEXT,
  price_per_kg NUMERIC(10, 2) NOT NULL,
  available_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  quantity_unit VARCHAR(10) DEFAULT 'KG' CHECK (quantity_unit IN ('KG', 'SACKS')),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED', 'OUT_OF_STOCK')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_farmer_id ON products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  image_id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Product Sack Sizes Table
CREATE TABLE IF NOT EXISTS product_sack_sizes (
  sack_size_id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  size_kg NUMERIC(10, 2) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_sack_sizes_product_id ON product_sack_sizes(product_id);

-- =============================================
-- CONSUMER DATA
-- =============================================

-- Consumer Addresses Table
CREATE TABLE IF NOT EXISTS consumer_addresses (
  address_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL,
  full_address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON consumer_addresses(user_id);

-- Payment Methods Table (Legacy)
CREATE TABLE IF NOT EXISTS payment_methods (
  payment_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('CARD', 'WALLET', 'UPI')),
  card_number_last4 VARCHAR(4),
  card_holder_name VARCHAR(100),
  expiry_month INTEGER,
  expiry_year INTEGER,
  upi_id VARCHAR(100),
  wallet_provider VARCHAR(50),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);

-- Consumer Payment Methods Table
CREATE TABLE IF NOT EXISTS consumer_payment_methods (
  payment_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  payment_type VARCHAR(20) NOT NULL,
  card_number_last4 VARCHAR(4),
  card_holder_name VARCHAR(100),
  expiry_month INTEGER,
  expiry_year INTEGER,
  upi_id VARCHAR(100),
  wallet_provider VARCHAR(50),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consumer_payment_methods_user_id ON consumer_payment_methods(user_id);

-- Consumer Favorites Table
CREATE TABLE IF NOT EXISTS consumer_favorites (
  favorite_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consumer_favorites_user_id ON consumer_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_consumer_favorites_product_id ON consumer_favorites(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_consumer_favorites ON consumer_favorites(user_id, product_id);

-- Favorites Table (Alternative)
CREATE TABLE IF NOT EXISTS favorites (
  favorite_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_favorites ON favorites(user_id, product_id);

-- Cart Items Table
CREATE TABLE IF NOT EXISTS cart_items (
  cart_item_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  sack_size_kg INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- =============================================
-- ORDERS AND TRANSACTIONS
-- =============================================

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  order_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  farmer_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  address_id INTEGER REFERENCES consumer_addresses(address_id) ON DELETE SET NULL,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED')),
  payment_method VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer_id ON orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  sack_size_kg INTEGER
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Order Rejections Table
CREATE TABLE IF NOT EXISTS order_rejections (
  rejection_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_rejections_order_id ON order_rejections(order_id);

-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
  transaction_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'PENDING',
  amount NUMERIC(10, 2) NOT NULL,
  gateway_transaction_id VARCHAR(255),
  gateway_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);

-- =============================================
-- FARMER FINANCIAL
-- =============================================

-- Farmer Ledger Table
CREATE TABLE IF NOT EXISTS farmer_ledger (
  ledger_id SERIAL PRIMARY KEY,
  farmer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('SALE', 'COMMISSION', 'PAYOUT', 'ADJUSTMENT', 'PAYOUT_REVERSAL')),
  amount NUMERIC(10, 2) NOT NULL,
  balance_before NUMERIC(10, 2),
  balance_after NUMERIC(10, 2),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farmer_ledger_farmer_id ON farmer_ledger(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_ledger_order_id ON farmer_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_farmer_ledger_transaction_type ON farmer_ledger(transaction_type);

-- Farmer Payouts Table
CREATE TABLE IF NOT EXISTS farmer_payouts (
  payout_id SERIAL PRIMARY KEY,
  farmer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  payout_period_start DATE,
  payout_period_end DATE,
  total_earnings NUMERIC(10, 2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED')),
  bank_account_number VARCHAR(50),
  bank_name VARCHAR(100),
  branch_code VARCHAR(20),
  payout_date DATE,
  transaction_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farmer_payouts_farmer_id ON farmer_payouts(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_payouts_status ON farmer_payouts(status);

-- =============================================
-- PLATFORM SETTINGS
-- =============================================

-- Commission Settings Table
CREATE TABLE IF NOT EXISTS commission_settings (
  setting_id SERIAL PRIMARY KEY,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
  min_commission NUMERIC(10, 2) DEFAULT 0,
  updated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Fee Settings Table
CREATE TABLE IF NOT EXISTS delivery_fee_settings (
  setting_id SERIAL PRIMARY KEY,
  base_fee NUMERIC(10, 2) NOT NULL DEFAULT 20.00,
  price_per_km NUMERIC(10, 2) DEFAULT 5.00,
  max_fee NUMERIC(10, 2) DEFAULT 200.00,
  min_fee NUMERIC(10, 2) DEFAULT 20.00,
  updated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- COD Settings Table
CREATE TABLE IF NOT EXISTS cod_settings (
  setting_id SERIAL PRIMARY KEY,
  farmer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  min_order_amount NUMERIC(10, 2) DEFAULT 0,
  max_order_amount NUMERIC(10, 2) DEFAULT 50000,
  allowed_areas TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cod_settings_farmer_id ON cod_settings(farmer_id);

-- COD Eligibility Table
CREATE TABLE IF NOT EXISTS cod_eligibility (
  eligibility_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  is_eligible BOOLEAN DEFAULT TRUE,
  reason TEXT,
  max_order_value NUMERIC(10, 2) DEFAULT 50000,
  restrictions TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cod_eligibility_user_id ON cod_eligibility(user_id);

-- =============================================
-- REVIEWS AND DISPUTES
-- =============================================

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  review_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
  consumer_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  farmer_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  product_id INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_consumer_id ON reviews(consumer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_farmer_id ON reviews(farmer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_order_consumer ON reviews(order_id, consumer_id);

-- Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
  dispute_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
  reported_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  reported_against INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  dispute_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED')),
  admin_notes TEXT,
  resolution TEXT,
  resolved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- =============================================
-- NOTIFICATIONS AND PROMOTIONS
-- =============================================

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Promo Codes Table
CREATE TABLE IF NOT EXISTS promo_codes (
  promo_id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value NUMERIC(10, 2) NOT NULL,
  min_order_amount NUMERIC(10, 2) DEFAULT 0,
  max_discount_amount NUMERIC(10, 2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active);

-- Featured Farmers Table
CREATE TABLE IF NOT EXISTS featured_farmers (
  feature_id SERIAL PRIMARY KEY,
  farmer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_featured_farmers_farmer_id ON featured_farmers(farmer_id);
CREATE INDEX IF NOT EXISTS idx_featured_farmers_is_active ON featured_farmers(is_active);

-- =============================================
-- DEFAULT DATA INSERTS
-- =============================================

-- Insert default commission settings (5% commission)
INSERT INTO commission_settings (commission_rate, min_commission, updated_at)
VALUES (5.00, 0, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Insert default delivery fee settings
INSERT INTO delivery_fee_settings (base_fee, price_per_km, max_fee, min_fee, updated_at)
VALUES (20.00, 5.00, 200.00, 20.00, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
