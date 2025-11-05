const Review = require('../models/Review');

// RR-3: Get reviews for farmer (farmer's own view)
exports.getFarmerReviews = async (req, res) => {
  try {
    const farmerId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;
    
    const reviews = await Review.getFarmerReviewsForDashboard(
      farmerId,
      parseInt(limit),
      parseInt(offset)
    );
    
    // Get average rating stats
    const ratingStats = await Review.getFarmerAverageRating(farmerId);
    
    res.json({ 
      success: true, 
      data: {
        reviews,
        stats: ratingStats
      }
    });
  } catch (error) {
    console.error('getFarmerReviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

