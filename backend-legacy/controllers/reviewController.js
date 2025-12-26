const Review = require('../models/Review');

// RR-1: Create or update review (Consumer)
exports.createReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, comment, productId } = req.body;
    const userId = req.user.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rating must be between 1 and 5' 
      });
    }

    // Get order to verify ownership and get farmer_id
    const Order = require('../models/Order');
    const order = await Order.getOrderDetails(orderId, userId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Can only review completed orders' 
      });
    }

    // Check if review already exists
    const existingReview = await Review.getReviewByOrder(orderId, userId);
    
    if (existingReview) {
      // Update existing review
      const updatedReview = await Review.updateReview(
        existingReview.review_id,
        userId,
        rating,
        comment
      );
      
      return res.json({ 
        success: true, 
        message: 'Review updated successfully',
        data: updatedReview 
      });
    }

    // Create new review
    const review = await Review.createReview({
      orderId,
      consumerId: userId,
      farmerId: order.farmer_id,
      productId: productId || null,
      rating,
      comment: comment || null
    });

    res.json({ 
      success: true, 
      message: 'Review submitted successfully',
      data: review 
    });
  } catch (error) {
    console.error('createReview error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to create review' 
    });
  }
};

// RR-2: Get reviews for farmer (public - for storefront/product pages)
exports.getFarmerReviews = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const reviews = await Review.getFarmerReviews(
      parseInt(farmerId),
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('getFarmerReviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

// RR-2: Get average rating for farmer
exports.getFarmerAverageRating = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const ratingData = await Review.getFarmerAverageRating(parseInt(farmerId));
    
    res.json({ success: true, data: ratingData });
  } catch (error) {
    console.error('getFarmerAverageRating error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rating' });
  }
};

// RR-2: Get reviews for product
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const reviews = await Review.getProductReviews(
      parseInt(productId),
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('getProductReviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

// RR-1: Check if order has been reviewed
exports.checkOrderReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    
    const hasReviewed = await Review.hasReviewedOrder(orderId, userId);
    let review = null;
    
    if (hasReviewed) {
      review = await Review.getReviewByOrder(orderId, userId);
    }
    
    res.json({ 
      success: true, 
      data: { 
        hasReviewed, 
        review 
      } 
    });
  } catch (error) {
    console.error('checkOrderReview error:', error);
    res.status(500).json({ success: false, message: 'Failed to check review status' });
  }
};

