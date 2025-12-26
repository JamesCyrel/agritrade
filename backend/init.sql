-- Users and Profiles
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS verification_documents CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS product_sack_sizes CASCADE;
DROP TABLE IF EXISTS consumer_addresses CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;

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
  verification_status VARCHAR(20) DEFAULT 'PENDING_DOCUMENTS' CHECK (verification_status IN ('PENDING_DOCUMENTS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')),
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

-- Farmer Verification Documents
CREATE TABLE IF NOT EXISTS verification_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL,
  file_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ver_docs_user ON verification_documents(user_id);

-- Products and Inventory
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

-- Consumer Data
CREATE TABLE IF NOT EXISTS consumer_addresses (
  address_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL,
  full_address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON consumer_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
