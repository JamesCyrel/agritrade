const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Consumer = require('../models/Consumer');
const Payment = require('../models/Payment');
const supabase = require('../config/supabase');
const Notification = require('../models/Notification');

// OC-3: Create order from cart (Checkout)
exports.createOrder = async (req, res) => {
  try {
    const { deliveryAddressId, paymentMethodId, paymentType, promoCode, notes } = req.body;
    const userId = req.user.userId;

    if (!deliveryAddressId) {
      return res.status(400).json({ success: false, message: 'Delivery address is required' });
    }

    // Get cart items first
    const cartItems = await Cart.getCartItems(userId);
    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Determine payment type
    const isCOD = paymentType === 'COD' || paymentMethodId === 'COD';
    
    // If COD, check eligibility before creating orders
    if (isCOD) {
      // Calculate total for COD eligibility check
      const totalAmount = cartItems.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
      }, 0);
      
      // Check COD eligibility for each unique farmer
      const farmerIds = [...new Set(cartItems.map(item => item.farmer_id))];
      for (const farmerId of farmerIds) {
        const eligibility = await Payment.checkCODEligibility(userId, totalAmount, farmerId);
        if (!eligibility.eligible) {
          return res.status(400).json({ success: false, message: eligibility.reason || 'COD not available for this order' });
        }
      }
    } else {
      // Digital payment requires payment method ID
      if (!paymentMethodId) {
        return res.status(400).json({ success: false, message: 'Payment method is required for digital payments' });
      }
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

      // Calculate delivery fee based on distance (OM-7)
      let deliveryFee = 50; // Default fallback
      try {
        // Get farmer location from profile via Supabase
        const { data: farmerProfile, error: farmerErr } = await supabase
          .from('profiles')
          .select('latitude, longitude')
          .eq('user_id', parseInt(farmerId))
          .single();

        // Get consumer delivery address location via Supabase
        const { data: address, error: addrErr } = await supabase
          .from('consumer_addresses')
          .select('latitude, longitude')
          .eq('address_id', deliveryAddressId)
          .single();

        if (!farmerErr && !addrErr && farmerProfile?.latitude && address?.latitude) {
          const Notification = require('../models/Notification');
          deliveryFee = await Notification.calculateDeliveryFee(
            farmerProfile.latitude,
            farmerProfile.longitude,
            address.latitude,
            address.longitude
          );
        }
      } catch (error) {
        console.error('Error calculating delivery fee:', error);
        // Use default fee on error
      }
      
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
        paymentMethodId: isCOD ? 'COD' : paymentMethodId,
        paymentType: isCOD ? 'COD' : 'DIGITAL',
        subtotal,
        deliveryFee,
        tax,
        discountAmount,
        promoCode: appliedPromoCode,
        totalAmount,
        notes,
        items: orderItems
      });

      // Process payment based on type
      if (isCOD) {
        // Create COD transaction
        const PaymentModel = require('../models/Payment');
        await PaymentModel.createTransaction(
          order.order_id,
          'COD',
          totalAmount,
          null,
          'COD - Payment pending delivery'
        );
      } else {
        // Process digital payment (will be handled separately or can be done here)
        // For now, we'll create a pending transaction
        const PaymentModel = require('../models/Payment');
        await PaymentModel.createTransaction(
          order.order_id,
          'CARD', // TODO: Determine from payment method
          totalAmount,
          null,
          'Digital payment pending'
        );
      }

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

// Cancel order (Consumer can cancel pending orders)
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    // Check if order exists and belongs to consumer
    const order = await Order.getOrderDetails(orderId, userId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only allow cancellation if order is still pending
    if (order.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot cancel order. Current status: ${order.status}. Only pending orders can be cancelled.` 
      });
    }

    // Cancel the order
    const cancelledOrder = await Order.cancelOrderByConsumer(orderId, userId);

    // Send notification to farmer (OM-6)
    try {
      await Notification.createNotification(
        order.farmer_id,
        'ORDER_CANCELLED',
        'Order Cancelled by Consumer',
        `Order ${order.order_number} was cancelled by the consumer.`,
        order.order_id
      );
    } catch (notifError) {
      console.error('Error sending notification to farmer:', notifError);
    }

    res.json({ 
      success: true, 
      message: 'Order cancelled successfully',
      data: cancelledOrder 
    });
  } catch (error) {
    console.error('cancelOrder error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to cancel order' 
    });
  }
};

