const pool = require('../config/database');

class Verification {
  static async createTables() {
    const query = `
      DO $$ BEGIN
        BEGIN
          ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
        EXCEPTION WHEN undefined_table THEN NULL; END;
      END $$;

      DO $$ BEGIN
        BEGIN
          ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);
        EXCEPTION WHEN undefined_table THEN NULL; END;
      END $$;

      DO $$ BEGIN
        BEGIN
          ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_reason TEXT;
        EXCEPTION WHEN undefined_table THEN NULL; END;
      END $$;

      CREATE TABLE IF NOT EXISTS verification_documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        doc_type VARCHAR(50) NOT NULL,
        file_data TEXT, -- store base64 or URL for now
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ver_docs_user ON verification_documents(user_id);
    `;
    await pool.query(query);
  }

  static async addDocument(userId, doc_type, file_data) {
    const res = await pool.query(
      `INSERT INTO verification_documents(user_id, doc_type, file_data) VALUES($1,$2,$3) RETURNING id, doc_type, created_at`,
      [userId, doc_type, file_data || null]
    );
    return res.rows[0];
  }

  static async listDocuments(userId) {
    const res = await pool.query(
      `SELECT id, doc_type, created_at FROM verification_documents WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }
}

module.exports = Verification;


