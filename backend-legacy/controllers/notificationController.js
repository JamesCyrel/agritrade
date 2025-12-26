const Notification = require('../models/Notification');

// OM-6: Get user notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50 } = req.query;
    
    const notifications = await Notification.getUserNotifications(userId, parseInt(limit));
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// OM-6: Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;
    
    const notification = await Notification.markAsRead(notificationId, userId);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification marked as read', data: notification });
  } catch (error) {
    console.error('markAsRead error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

// OM-6: Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    await Notification.markAllAsRead(userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
  }
};

// OM-6: Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await Notification.getUnreadCount(userId);
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
};

// OM-7: Get delivery fee settings (Admin only)
exports.getDeliveryFeeSettings = async (req, res) => {
  try {
    const settings = await Notification.getDeliveryFeeSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('getDeliveryFeeSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch delivery fee settings' });
  }
};

// OM-7: Update delivery fee settings (Admin only)
exports.updateDeliveryFeeSettings = async (req, res) => {
  try {
    const { base_fee, price_per_km, min_fee, max_fee } = req.body;
    const updatedBy = req.user.userId;
    
    if (!base_fee || !price_per_km) {
      return res.status(400).json({ 
        success: false, 
        message: 'base_fee and price_per_km are required' 
      });
    }
    
    const settings = await Notification.updateDeliveryFeeSettings(
      { base_fee, price_per_km, min_fee, max_fee },
      updatedBy
    );
    
    res.json({ 
      success: true, 
      message: 'Delivery fee settings updated successfully',
      data: settings 
    });
  } catch (error) {
    console.error('updateDeliveryFeeSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update delivery fee settings' });
  }
};

