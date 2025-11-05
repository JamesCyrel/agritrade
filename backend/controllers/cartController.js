const Cart = require('../models/Cart');
const Product = require('../models/Product');

// OC-1: Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity, sackSizeKg } = req.body;
    const userId = req.user.userId;

    if (!productId || !quantity) {
      return res.status(400).json({ success: false, message: 'Product ID and quantity are required' });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product || product.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, message: 'Product not found or not available' });
    }

    // Check availability
    if (parseFloat(quantity) > parseFloat(product.available_quantity)) {
      return res.status(400).json({ success: false, message: 'Insufficient quantity available' });
    }

    // Determine unit price
    let unitPrice = parseFloat(product.price_per_kg);
    if (sackSizeKg) {
      // Find sack size price - compare as numbers to handle decimal precision
      const requestedSize = parseFloat(sackSizeKg);
      // Ensure sack_sizes exists and is an array
      if (!product.sack_sizes || !Array.isArray(product.sack_sizes) || product.sack_sizes.length === 0) {
        return res.status(400).json({ success: false, message: 'No sack sizes available for this product' });
      }
      
      const sackSize = product.sack_sizes.find(s => {
        const dbSize = parseFloat(s.size_kg);
        // Use a small epsilon for floating point comparison
        return Math.abs(dbSize - requestedSize) < 0.01;
      });
      
      if (!sackSize) {
        console.error('Sack size not found:', {
          requested: requestedSize,
          requestedType: typeof sackSizeKg,
          available: product.sack_sizes.map(s => ({
            size_kg: s.size_kg,
            size_kg_type: typeof s.size_kg,
            size_kg_parsed: parseFloat(s.size_kg),
            price: s.price
          }))
        });
        return res.status(400).json({ 
          success: false, 
          message: `Invalid sack size. Available sizes: ${product.sack_sizes.map(s => `${parseFloat(s.size_kg)}kg`).join(', ')}` 
        });
      }
      unitPrice = parseFloat(sackSize.price);
    }

    const cartItem = await Cart.addItem(userId, productId, quantity, unitPrice, sackSizeKg ? parseFloat(sackSizeKg) : null);
    res.json({ success: true, message: 'Item added to cart', data: cartItem });
  } catch (error) {
    console.error('addToCart error:', error);
    res.status(500).json({ success: false, message: 'Failed to add item to cart' });
  }
};

// OC-2: Get cart items
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cartItems = await Cart.getCartItems(userId);
    
    // Calculate totals for each item
    const itemsWithTotals = cartItems.map(item => ({
      ...item,
      item_total: parseFloat(item.quantity) * parseFloat(item.unit_price)
    }));

    const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.item_total, 0);

    res.json({
      success: true,
      data: {
        items: itemsWithTotals,
        subtotal: subtotal,
        item_count: itemsWithTotals.length
      }
    });
  } catch (error) {
    console.error('getCart error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
};

// OC-2: Update cart item quantity
exports.updateCartItem = async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.userId;

    if (!quantity || parseFloat(quantity) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid quantity is required' });
    }

    // Check if item exists and get product availability
    const cartItem = await Cart.getCartItemById(cartItemId, userId);
    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    const product = await Product.findById(cartItem.product_id);
    if (parseFloat(quantity) > parseFloat(product.available_quantity)) {
      return res.status(400).json({ success: false, message: 'Insufficient quantity available' });
    }

    const updatedItem = await Cart.updateQuantity(cartItemId, userId, quantity);
    res.json({ success: true, message: 'Cart item updated', data: updatedItem });
  } catch (error) {
    console.error('updateCartItem error:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart item' });
  }
};

// OC-2: Remove item from cart
exports.removeCartItem = async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const userId = req.user.userId;

    const removed = await Cart.removeItem(cartItemId, userId);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('removeCartItem error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove cart item' });
  }
};

// OC-2: Clear cart
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    await Cart.clearCart(userId);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('clearCart error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};

