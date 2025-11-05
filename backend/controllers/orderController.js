const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Consumer = require('../models/Consumer');

// OC-3: Create order from cart (Checkout)
exports.createOrder = async (req, res) => {
  try {
    const { deliveryAddressId, paymentMethodId, promoCode, notes } = req.body;
    const userId = req.user.userId;

    if (!deliveryAddressId || !paymentMethodId) {
      return res.status(400).json({ success: false, message: 'Delivery address and payment method are required' });
    }

    // Get cart items
    const cartItems = await Cart.getCartItems(userId);
    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Group items by farmer
    const itemsByFarmer = {};
    for (const item of cartItems) {
      const farmerId = item.farmer_id;
      if (!itemsByFarmer[farmerId]) {
        itemsByFarmer[farmerId] = [];
      }
      itemsByFarmer[farmerId].push(item);
    }

    // Create orders for each farmer (one order per farmer)
    const orders = [];
    for (const [farmerId, items] of Object.entries(itemsByFarmer)) {
      // Calculate subtotal
      const subtotal = items.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
      }, 0);

      // Validate and apply promo code
      let discountAmount = 0;
      let appliedPromoCode = null;
      if (promoCode) {
        const promoResult = await Order.validatePromoCode(promoCode, subtotal);
        if (promoResult) {
          discountAmount = promoResult.discount_amount;
          appliedPromoCode = promoResult.code;
        } else {
          return res.status(400).json({ success: false, message: 'Invalid or inapplicable promo code' });
        }
      }

      // Calculate delivery fee (placeholder - can be enhanced with distance calculation)
      const deliveryFee = 50; // Base delivery fee
      const tax = (subtotal - discountAmount) * 0.12; // 12% tax (placeholder)
      const totalAmount = subtotal - discountAmount + deliveryFee + tax;

      // Prepare order items
      const orderItems = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        sack_size_kg: item.sack_size_kg,
        subtotal: parseFloat(item.quantity) * parseFloat(item.unit_price)
      }));

      // Create order
      const order = await Order.createOrder({
        consumerId: userId,
        farmerId: parseInt(farmerId),
        deliveryAddressId,
        paymentMethodId,
        subtotal,
        deliveryFee,
        tax,
        discountAmount,
        promoCode: appliedPromoCode,
        totalAmount,
        notes,
        items: orderItems
      });

      // Decrement inventory for each item (PM-4)
      for (const item of items) {
        const quantityToDecrement = item.sack_size_kg 
          ? parseFloat(item.quantity) * parseFloat(item.sack_size_kg) // Convert sacks to kg
          : parseFloat(item.quantity); // Already in kg
        await Product.decrementInventory(item.product_id, quantityToDecrement);
      }

      orders.push(order);
    }

    // Clear cart after successful order
    await Cart.clearCart(userId);

    res.json({
      success: true,
      message: 'Order placed successfully',
      data: orders.length === 1 ? orders[0] : orders
    });
  } catch (error) {
    console.error('createOrder error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

// Get consumer orders
exports.getConsumerOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orders = await Order.getConsumerOrders(userId);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('getConsumerOrders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const order = await Order.getOrderDetails(orderId, userId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('getOrderDetails error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
};

// OC-4: Validate promo code
exports.validatePromoCode = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code || !orderAmount) {
      return res.status(400).json({ success: false, message: 'Promo code and order amount are required' });
    }

    const promoResult = await Order.validatePromoCode(code, parseFloat(orderAmount));
    if (!promoResult) {
      return res.status(400).json({ success: false, message: 'Invalid or inapplicable promo code' });
    }

    res.json({ success: true, data: promoResult });
  } catch (error) {
    console.error('validatePromoCode error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate promo code' });
  }
};

