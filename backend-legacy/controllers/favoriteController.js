const Consumer = require('../models/Consumer');

// Add product to favorites
exports.addFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const favorite = await Consumer.addFavorite(req.user.userId, parseInt(productId));
    
    if (favorite) {
      res.json({ success: true, message: 'Product added to favorites', data: favorite });
    } else {
      res.json({ success: true, message: 'Product already in favorites' });
    }
  } catch (error) {
    console.error('addFavorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to add to favorites' });
  }
};

// Remove product from favorites
exports.removeFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await Consumer.removeFavorite(req.user.userId, parseInt(productId));
    
    if (result) {
      res.json({ success: true, message: 'Product removed from favorites' });
    } else {
      res.status(404).json({ success: false, message: 'Favorite not found' });
    }
  } catch (error) {
    console.error('removeFavorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove from favorites' });
  }
};

// Get all favorites for consumer
exports.getFavorites = async (req, res) => {
  try {
    const favorites = await Consumer.getFavorites(req.user.userId);
    res.json({ success: true, data: favorites });
  } catch (error) {
    console.error('getFavorites error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch favorites' });
  }
};

// Check if product is favorited
exports.checkFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const isFavorite = await Consumer.isFavorite(req.user.userId, parseInt(productId));
    res.json({ success: true, isFavorite });
  } catch (error) {
    console.error('checkFavorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to check favorite status' });
  }
};

// Toggle favorite (add if not favorited, remove if favorited)
exports.toggleFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const isFavorite = await Consumer.isFavorite(req.user.userId, parseInt(productId));
    
    if (isFavorite) {
      await Consumer.removeFavorite(req.user.userId, parseInt(productId));
      res.json({ success: true, isFavorite: false, message: 'Product removed from favorites' });
    } else {
      await Consumer.addFavorite(req.user.userId, parseInt(productId));
      res.json({ success: true, isFavorite: true, message: 'Product added to favorites' });
    }
  } catch (error) {
    console.error('toggleFavorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle favorite' });
  }
};

