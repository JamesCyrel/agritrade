const { Pool } = require('pg');
require('dotenv').config();

// If Supabase is configured, disable direct pg pool usage to avoid localhost:5432 connections
if (process.env.SUPABASE_URL) {
  console.warn('ℹ️  Supabase detected. Disabling local pg pool. Refactor callers to use supabase client.');
  const errorProxy = new Proxy({}, {
    get() {
      throw new Error('Deprecated: pg pool is disabled during Supabase migration. Import backend/config/supabase and use Supabase queries instead.');
    }
  });
  module.exports = errorProxy;
} else {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  // Test connection
  pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
  });

  // Test query to verify connection
  pool.query('SELECT NOW()', (err) => {
    if (err) {
      console.error('❌ Database connection error:', err);
    } else {
      console.log('✅ Database connection successful');
    }
  });

  module.exports = pool;
}

