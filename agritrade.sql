-- AgriTrade Database Schema (DDL)
-- Safe to run multiple times; uses IF NOT EXISTS and defensive migrations

-- USERS + PROFILES
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('CONSUMER', 'FARMER', 'ADMIN')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  profile_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  farm_name VARCHAR(255),
  address TEXT,
  bank_account_number VARCHAR(50),
  bank_name VARCHAR(100),
  branch_code VARCHAR(20),
  verification_status VARCHAR(20) DEFAULT 'NOT_SUBMITTED' CHECK (verification_status IN ('NOT_SUBMITTED', 'PENDING_DOCUMENTS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')),
  verification_reason TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_user_id ON profiles(user_id);

DO $$ BEGIN
  BEGIN ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_reason TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7); EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- VERIFICATION DOCUMENTS
CREATE TABLE IF NOT EXISTS verification_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL,
  file_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_verification_documents_user_id ON verification_documents(user_id);

-- CONSUMER TABLES
CREATE TABLE IF NOT EXISTS consumer_addresses (
  address_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  label VARCHAR(100),
  full_address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consumer_payment_methods (
  payment_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('CARD', 'WALLET', 'UPI')),
  card_number_last4 VARCHAR(4),
  card_holder_name VARCHAR(255),
  expiry_month INTEGER,
  expiry_year INTEGER,
  upi_id VARCHAR(255),
  wallet_provider VARCHAR(50),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON consumer_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON consumer_payment_methods(user_id);


-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  product_id SERIAL PRIMARY KEY,
  farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  rice_type VARCHAR(20) NOT NULL CHECK (rice_type IN ('MILLED', 'UNMILLED_PADDY')),
  variety_name VARCHAR(255) NOT NULL,
  description TEXT,
  price_per_kg DECIMAL(10, 2) NOT NULL,
  available_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  quantity_unit VARCHAR(10) DEFAULT 'KG' CHECK (quantity_unit IN ('KG', 'SACKS')),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_images (
  image_id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_sack_sizes (
  sack_size_id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  size_kg DECIMAL(10, 2) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_farmer_id ON products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sack_sizes_product_id ON product_sack_sizes(product_id);

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_status_check' 
    AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products DROP CONSTRAINT products_status_check;
  END IF;
  ALTER TABLE products ADD CONSTRAINT products_status_check 
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED'));
END $$;

DO $$ BEGIN
  UPDATE products SET status = 'ARCHIVED' WHERE status = 'DELETED';
END $$;

-- CONSUMER FAVORITES (depends on products)
CREATE TABLE IF NOT EXISTS consumer_favorites (
  favorite_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON consumer_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON consumer_favorites(product_id);

-- CART
CREATE TABLE IF NOT EXISTS cart_items (
  cart_item_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  sack_size_kg DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id, sack_size_kg)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  order_id SERIAL PRIMARY KEY,
  consumer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
  delivery_address_id INTEGER REFERENCES consumer_addresses(address_id) ON DELETE SET NULL,
  payment_method_id INTEGER REFERENCES consumer_payment_methods(payment_id) ON DELETE SET NULL,
  payment_type VARCHAR(20) DEFAULT 'DIGITAL' CHECK (payment_type IN ('DIGITAL', 'COD')),
  subtotal DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  promo_code VARCHAR(50),
  total_amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  sack_size_kg DECIMAL(10, 2),
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promo_codes (
  promo_id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  max_discount_amount DECIMAL(10, 2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_rejections (
  rejection_id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_consumer_id ON orders(consumer_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer_id ON orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_order_rejections_order_id ON order_rejections(order_id);

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_type VARCHAR(20) DEFAULT 'DIGITAL';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_payment_type_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_type_check 
      CHECK (payment_type IN ('DIGITAL', 'COD'));
  END IF;
END $$;

-- PAYMENTS, LEDGER, COMMISSION, COD, PAYOUTS
CREATE TABLE IF NOT EXISTS payment_transactions (
  transaction_id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CARD', 'WALLET', 'UPI', 'COD')),
  payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  amount DECIMAL(10, 2) NOT NULL,
  gateway_transaction_id VARCHAR(255),
  gateway_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS farmer_payouts (
  payout_id SERIAL PRIMARY KEY,
  farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  payout_period_start DATE NOT NULL,
  payout_period_end DATE NOT NULL,
  total_earnings DECIMAL(10, 2) NOT NULL,
  commission_amount DECIMAL(10, 2) NOT NULL,
  net_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  bank_account_number VARCHAR(50),
  bank_name VARCHAR(100),
  branch_code VARCHAR(20),
  payout_date DATE,
  transaction_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cod_settings (
  setting_id SERIAL PRIMARY KEY,
  farmer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  max_order_amount DECIMAL(10, 2),
  allowed_areas TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(farmer_id)
);

CREATE TABLE IF NOT EXISTS cod_eligibility (
  eligibility_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  is_eligible BOOLEAN DEFAULT TRUE,
  reason TEXT,
  max_order_value DECIMAL(10, 2),
  restrictions TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS commission_settings (
  setting_id SERIAL PRIMARY KEY,
  commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.05,
  min_commission DECIMAL(10, 2) DEFAULT 0,
  updated_by INTEGER REFERENCES users(user_id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(setting_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_farmer_ledger_farmer_id ON farmer_ledger(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_ledger_order_id ON farmer_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_farmer_payouts_farmer_id ON farmer_payouts(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_payouts_status ON farmer_payouts(status);
CREATE INDEX IF NOT EXISTS idx_cod_settings_farmer_id ON cod_settings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_cod_eligibility_user_id ON cod_eligibility(user_id);

INSERT INTO commission_settings (commission_rate, setting_id)
SELECT 0.05, 1
WHERE NOT EXISTS (SELECT 1 FROM commission_settings);

-- NOTIFICATIONS + DELIVERY FEE SETTINGS
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

CREATE TABLE IF NOT EXISTS delivery_fee_settings (
  setting_id SERIAL PRIMARY KEY,
  base_fee DECIMAL(10, 2) NOT NULL DEFAULT 50,
  price_per_km DECIMAL(10, 2) NOT NULL DEFAULT 5,
  max_fee DECIMAL(10, 2),
  min_fee DECIMAL(10, 2) DEFAULT 20,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM delivery_fee_settings LIMIT 1) THEN
    INSERT INTO delivery_fee_settings (base_fee, price_per_km, min_fee, max_fee)
    VALUES (50, 5, 20, 500);
  END IF;
END $$;

-- REVIEWS
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

CREATE INDEX IF NOT EXISTS idx_reviews_farmer_id ON reviews(farmer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_consumer_id ON reviews(consumer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- DISPUTES
CREATE TABLE IF NOT EXISTS disputes (
  dispute_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
  reported_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reported_against INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  dispute_type VARCHAR(50) NOT NULL CHECK (dispute_type IN ('PRODUCT_QUALITY', 'DELIVERY_ISSUE', 'PAYMENT', 'OTHER')),
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  admin_notes TEXT,
  resolution TEXT,
  resolved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reported_by ON disputes(reported_by);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- HOMEPAGE FEATURED FARMERS
CREATE TABLE IF NOT EXISTS featured_farmers (
  feature_id SERIAL PRIMARY KEY,
  farmer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(farmer_id)
);

CREATE INDEX IF NOT EXISTS idx_featured_farmers_active ON featured_farmers(is_active);
CREATE INDEX IF NOT EXISTS idx_featured_farmers_order ON featured_farmers(display_order);


