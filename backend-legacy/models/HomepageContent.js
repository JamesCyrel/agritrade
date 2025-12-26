const pool = require('../config/database');

class HomepageContent {
  // Create homepage content tables (AD-5)
  static async createTable() {
    const query = `
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
    `;

    try {
      await pool.query(query);
      console.log('✅ Homepage content tables created/verified');
    } catch (error) {
      console.error('❌ Error creating homepage content tables:', error);
      throw error;
    }
  }

  // Add featured farmer
  static async addFeaturedFarmer(farmerId, displayOrder = null) {
    // Get max order if not provided
    if (displayOrder === null) {
      const maxResult = await pool.query(
        `SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM featured_farmers`
      );
      displayOrder = parseInt(maxResult.rows[0].next_order);
    }

    const result = await pool.query(
      `INSERT INTO featured_farmers (farmer_id, display_order, is_active)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (farmer_id) 
       DO UPDATE SET is_active = TRUE, display_order = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [farmerId, displayOrder]
    );

    return result.rows[0];
  }

  // Remove featured farmer
  static async removeFeaturedFarmer(farmerId) {
    const result = await pool.query(
      `UPDATE featured_farmers SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE farmer_id = $1
       RETURNING *`,
      [farmerId]
    );

    return result.rows[0];
  }

  // Get all featured farmers
  static async getFeaturedFarmers(activeOnly = false) {
    const whereClause = activeOnly ? 'WHERE is_active = TRUE' : '';
    
    const result = await pool.query(
      `SELECT 
        ff.*,
        pr.farm_name,
        pr.full_name,
        pr.verification_status,
        (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE farmer_id = ff.farmer_id) as average_rating
       FROM featured_farmers ff
       INNER JOIN profiles pr ON ff.farmer_id = pr.user_id
       ${whereClause}
       ORDER BY ff.display_order ASC, ff.created_at DESC`
    );

    return result.rows;
  }

  // Update display order
  static async updateDisplayOrder(farmerId, displayOrder) {
    const result = await pool.query(
      `UPDATE featured_farmers
       SET display_order = $1, updated_at = CURRENT_TIMESTAMP
       WHERE farmer_id = $2
       RETURNING *`,
      [displayOrder, farmerId]
    );

    return result.rows[0];
  }
}

module.exports = HomepageContent;

