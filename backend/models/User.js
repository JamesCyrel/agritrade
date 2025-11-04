const pool = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // Create users table if it doesn't exist
  static async createTable() {
    const query = `
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

      -- Ensure one profile per user
      CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_user_id ON profiles(user_id);

      -- Backfill columns if table existed before (safe no-ops if present)
      DO $$ BEGIN
        BEGIN ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_reason TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7); EXCEPTION WHEN duplicate_column THEN NULL; END;
      END $$;
    `;

    try {
      await pool.query(query);
      console.log('✅ Users and Profiles tables created/verified');
    } catch (error) {
      console.error('❌ Error creating tables:', error);
      throw error;
    }
  }

  // Find user by email or phone
  static async findByEmailOrPhone(email, phone) {
    const query = `
      SELECT 
        u.user_id,
        u.email,
        u.phone,
        u.password_hash,
        u.role,
        u.created_at,
        p.profile_id,
        p.full_name,
        p.farm_name,
        p.verification_status
      FROM users u
      LEFT JOIN profiles p ON u.user_id = p.user_id
      WHERE u.email = $1 OR u.phone = $2
    `;

    try {
      const result = await pool.query(query, [email || null, phone || null]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user:', error);
      throw error;
    }
  }

  // Create new user
  static async create(userData) {
    const { email, phone, password, role } = userData;

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const userQuery = `
      INSERT INTO users (email, phone, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id, email, phone, role, created_at
    `;

    try {
      const userResult = await pool.query(userQuery, [
        email || null,
        phone || null,
        passwordHash,
        role
      ]);

      const user = userResult.rows[0];

      // Create profile entry
      const profileQuery = `
        INSERT INTO profiles (user_id)
        VALUES ($1)
        RETURNING profile_id
      `;

      await pool.query(profileQuery, [user.user_id]);

      return {
        user_id: user.user_id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at
      };
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        if (error.constraint.includes('email')) {
          throw new Error('Email already exists');
        } else if (error.constraint.includes('phone')) {
          throw new Error('Phone number already exists');
        }
      }
      
      throw error;
    }
  }

  // Verify password
  static async verifyPassword(password, passwordHash) {
    return await bcrypt.compare(password, passwordHash);
  }

  // Find user by ID
  static async findById(userId) {
    const query = `
      SELECT 
        u.user_id,
        u.email,
        u.phone,
        u.role,
        u.created_at,
        p.profile_id,
        p.full_name,
        p.farm_name,
        p.verification_status
      FROM users u
      LEFT JOIN profiles p ON u.user_id = p.user_id
      WHERE u.user_id = $1
    `;

    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }
}

module.exports = User;

