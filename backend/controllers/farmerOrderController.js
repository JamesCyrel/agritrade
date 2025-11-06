const Order = require('../models/Order');
const Notification = require('../models/Notification');
const pool = require('../config/database');

// OM-2: Get farmer orders (filtered by status)
exports.getFarmerOrders = async (req, res) => {
  try {
    const farmerId = req.user.userId;
    const { status } = req.query;
    
    const orders = await Order.getFarmerOrders(farmerId, status || null);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('getFarmerOrders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// OM-2: Get order details
exports.getFarmerOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const farmerId = req.user.userId;
    
    const order = await Order.getFarmerOrderDetails(orderId, farmerId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('getFarmerOrderDetails error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
};

// OM-3: Accept order
exports.acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const farmerId = req.user.userId;
    
    const order = await Order.acceptOrder(orderId, farmerId);
    
    // Send notification to consumer (OM-6)
    try {
      await Notification.createNotification(
        order.consumer_id,
        'ORDER_CONFIRMED',
        'Order Confirmed!',
        `Your order ${order.order_number} has been confirmed by the farmer.`,
        order.order_id
      );
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }
    
    res.json({ 
      success: true, 
      message: 'Order accepted successfully',
      data: order 
    });
  } catch (error) {
    console.error('acceptOrder error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to accept order' 
    });
  }
};

// OM-3: Reject order
exports.rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, notes } = req.body;
    const farmerId = req.user.userId;
    
    if (!reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rejection reason is required' 
      });
    }
    
    // Valid rejection reasons
    const validReasons = [
      'OUT_OF_STOCK',
      'CANNOT_DELIVER_TO_LOCATION',
      'PRODUCT_UNAVAILABLE',
      'OTHER'
    ];
    
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid rejection reason' 
      });
    }
    
    const order = await Order.rejectOrder(orderId, farmerId, reason, notes);
    
    // Send notification to consumer (OM-6)
    try {
      await Notification.createNotification(
        order.consumer_id,
        'ORDER_CANCELLED',
        'Order Cancelled',
        `Your order ${order.order_number} was cancelled by the farmer. Reason: ${reason.replace(/_/g, ' ')}`,
        order.order_id
      );
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }
    
    res.json({ 
      success: true, 
      message: 'Order rejected successfully',
      data: order 
    });
  } catch (error) {
    console.error('rejectOrder error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to reject order' 
    });
  }
};

// OM-4: Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    let { status } = req.body;
    const farmerId = req.user.userId;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status is required' 
      });
    }
    
    // Normalize status label from UI ('COMPLETED' -> 'DELIVERED')
    if (status === 'COMPLETED') {
      status = 'DELIVERED';
    }

    const order = await Order.updateStatus(orderId, farmerId, status);
    
    // Send notification to consumer based on status (OM-6)
    try {
      let notificationTitle = 'Order Updated';
      let notificationMessage = `Your order ${order.order_number} status has been updated.`;
      
      if (status === 'OUT_FOR_DELIVERY') {
        notificationTitle = 'Order Out for Delivery!';
        notificationMessage = `Your order ${order.order_number} is now out for delivery!`;
        await Notification.createNotification(
          order.consumer_id,
          'OUT_FOR_DELIVERY',
          notificationTitle,
          notificationMessage,
          order.order_id
        );
      } else if (status === 'DELIVERED') {
        notificationTitle = 'Order Delivered!';
        notificationMessage = `Your order ${order.order_number} has been delivered. Please rate your experience!`;
        await Notification.createNotification(
          order.consumer_id,
          'ORDER_DELIVERED',
          notificationTitle,
          notificationMessage,
          order.order_id
        );

        // Record earnings upon delivery (ensure single write for both DIGITAL and COD)
        try {
          const Payment = require('../models/Payment');
          const alreadyRecorded = await Payment.hasEarningForOrder(order.farmer_id, order.order_id);
          if (!alreadyRecorded) {
            const received = parseFloat(order.total_amount || 0);
            const commissionSettings = await Payment.getCommissionRate();
            const commissionRate = commissionSettings.rate;
            const commissionAmount = received * commissionRate;
            const earningAmount = received - commissionAmount;

            await Payment.addLedgerEntry(
              order.farmer_id,
              order.order_id,
              'EARNING',
              earningAmount,
              `Order ${order.order_number} - Gross earning`
            );

            await Payment.addLedgerEntry(
              order.farmer_id,
              order.order_id,
              'COMMISSION',
              -commissionAmount,
              `Order ${order.order_number} - Platform commission (${commissionRate * 100}%)`
            );
          }
        } catch (ledgerErr) {
          console.error('Error recording COD earnings:', ledgerErr);
        }
      }
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }
    
    res.json({ 
      success: true, 
      message: 'Order status updated successfully',
      data: order 
    });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to update order status' 
    });
  }
};

