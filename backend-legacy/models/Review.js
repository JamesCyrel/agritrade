const pool = require('../config/database');

class Review {
  // Create reviews table (RR-1, RR-2, RR-3)
  static async createTable() {
    const query = `
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
    `;

    try {
      await pool.query(query);
      console.log('✅ Review tables created/verified');
    } catch (error) {
      console.error('❌ Error creating review tables:', error);
      throw error;
    }
  }

  // RR-1: Create rating and review (Consumer)
  static async createReview(reviewData) {
    const { orderId, consumerId, farmerId, productId, rating, comment } = reviewData;
    
    // Verify order exists and is completed
    const orderCheck = await pool.query(
      `SELECT status, consumer_id FROM orders WHERE order_id = $1`,
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    if (orderCheck.rows[0].status !== 'DELIVERED') {
      throw new Error('Can only review completed orders');
    }
    
    if (orderCheck.rows[0].consumer_id !== parseInt(consumerId)) {
      throw new Error('Order does not belong to this consumer');
    }
    
    // Check if review already exists
    const existingReview = await pool.query(
      `SELECT review_id FROM reviews WHERE order_id = $1 AND consumer_id = $2`,
      [orderId, consumerId]
    );
    
    if (existingReview.rows.length > 0) {
      throw new Error('Review already exists for this order');
    }
    
    const result = await pool.query(
      `INSERT INTO reviews (order_id, consumer_id, farmer_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orderId, consumerId, farmerId, productId || null, rating, comment || null]
    );
    
    return result.rows[0];
  }

  // RR-1: Update existing review
  static async updateReview(reviewId, consumerId, rating, comment) {
    const result = await pool.query(
      `UPDATE reviews
       SET rating = $1, comment = $2, updated_at = CURRENT_TIMESTAMP
       WHERE review_id = $3 AND consumer_id = $4
       RETURNING *`,
      [rating, comment || null, reviewId, consumerId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Review not found or not yours');
    }
    
    return result.rows[0];
  }

  // RR-2: Get average rating for farmer
  static async getFarmerAverageRating(farmerId) {
    const result = await pool.query(
      `SELECT 
        COALESCE(AVG(rating), 0) as average_rating,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM reviews
       WHERE farmer_id = $1`,
      [farmerId]
    );
    
    return result.rows[0];
  }

  // RR-2: Get reviews for farmer (for public display on storefront/products)
  static async getFarmerReviews(farmerId, limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT 
        r.*,
        u.email as consumer_email,
        p.full_name as consumer_name,
        o.order_number,
        pr.variety_name as product_name
       FROM reviews r
       INNER JOIN users u ON r.consumer_id = u.user_id
       LEFT JOIN profiles p ON r.consumer_id = p.user_id
       LEFT JOIN orders o ON r.order_id = o.order_id
       LEFT JOIN products pr ON r.product_id = pr.product_id
       WHERE r.farmer_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [farmerId, limit, offset]
    );
    
    return result.rows;
  }

  // RR-3: Get reviews for farmer (farmer's own view)
  static async getFarmerReviewsForDashboard(farmerId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT 
        r.*,
        u.email as consumer_email,
        p.full_name as consumer_name,
        o.order_number,
        pr.variety_name as product_name,
        o.created_at as order_date
       FROM reviews r
       INNER JOIN users u ON r.consumer_id = u.user_id
       LEFT JOIN profiles p ON r.consumer_id = p.user_id
       LEFT JOIN orders o ON r.order_id = o.order_id
       LEFT JOIN products pr ON r.product_id = pr.product_id
       WHERE r.farmer_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [farmerId, limit, offset]
    );
    
    return result.rows;
  }

  // RR-2: Get reviews for a specific product
  static async getProductReviews(productId, limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT 
        r.*,
        u.email as consumer_email,
        p.full_name as consumer_name,
        o.order_number
       FROM reviews r
       INNER JOIN users u ON r.consumer_id = u.user_id
       LEFT JOIN profiles p ON r.consumer_id = p.user_id
       LEFT JOIN orders o ON r.order_id = o.order_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    );
    
    return result.rows;
  }

  // Check if consumer has already reviewed an order
  static async hasReviewedOrder(orderId, consumerId) {
    const result = await pool.query(
      `SELECT review_id FROM reviews WHERE order_id = $1 AND consumer_id = $2`,
      [orderId, consumerId]
    );
    
    return result.rows.length > 0;
  }

  // Get review for a specific order
  static async getReviewByOrder(orderId, consumerId) {
    const result = await pool.query(
      `SELECT * FROM reviews WHERE order_id = $1 AND consumer_id = $2`,
      [orderId, consumerId]
    );
    
    return result.rows[0] || null;
  }
}

module.exports = Review;

