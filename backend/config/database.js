const { Pool } = require('pg');
require('dotenv').config();

// Mock pool that returns empty results when database is not configured
const createMockPool = () => {
  return {
    query: async () => ({ rows: [], rowCount: 0 }),
    connect: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => {} }),
    on: () => {},
  };
};

// If Supabase is configured, use Supabase's direct database connection
if (process.env.SUPABASE_URL && process.env.SUPABASE_DB_URL) {
  console.log('ℹ️  Using Supabase database connection for complex queries');
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  // Test connection
  pool.on('connect', () => {
    console.log('✅ Connected to Supabase PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected error on Supabase database client', err);
  });

  module.exports = pool;
} else if (process.env.DB_HOST) {
  // Local PostgreSQL connection
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
} else {
  console.warn('⚠️  No database configuration found. Using mock pool (empty results).');
  console.warn('⚠️  Set SUPABASE_DB_URL or DB_HOST in .env to enable database features.');
  module.exports = createMockPool();
}

