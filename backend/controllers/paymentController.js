const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Profile = require('../models/Profile');

// PS-1: Process digital payment (Stripe integration placeholder)
exports.processDigitalPayment = async (req, res) => {
  try {
    const { orderId, paymentMethodId, paymentDetails } = req.body;
    const userId = req.user.userId;

    if (!orderId || !paymentMethodId) {
      return res.status(400).json({ success: false, message: 'Order ID and payment method ID are required' });
    }

    // Get order details
    const order = await Order.getOrderDetails(orderId, userId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.payment_type === 'COD') {
      return res.status(400).json({ success: false, message: 'This order is COD, cannot process digital payment' });
    }

    // TODO: Integrate with actual payment gateway (Stripe)
    // For now, this is a placeholder that simulates payment processing
    const paymentResult = await simulatePaymentGateway(order.total_amount, paymentDetails);

    if (paymentResult.success) {
      // Create payment transaction
      const transaction = await Payment.createTransaction(
        orderId,
        'CARD', // or determine from payment method
        order.total_amount,
        paymentResult.transactionId,
        JSON.stringify(paymentResult)
      );

      // Update transaction status
      await Payment.updateTransactionStatus(transaction.transaction_id, 'COMPLETED');

      // Record earning in farmer ledger (PS-3)
      const commissionSettings = await Payment.getCommissionRate();
      const commissionRate = commissionSettings.rate;
      const commissionAmount = order.total_amount * commissionRate;
      const earningAmount = order.total_amount - commissionAmount;

      await Payment.addLedgerEntry(
        order.farmer_id,
        orderId,
        'EARNING',
        earningAmount,
        `Order ${order.order_number} - Gross earning`
      );

      await Payment.addLedgerEntry(
        order.farmer_id,
        orderId,
        'COMMISSION',
        -commissionAmount,
        `Order ${order.order_number} - Platform commission (${commissionRate * 100}%)`
      );

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          transactionId: transaction.transaction_id,
          gatewayTransactionId: paymentResult.transactionId
        }
      });
    } else {
      // Create failed transaction
      const transaction = await Payment.createTransaction(
        orderId,
        'CARD',
        order.total_amount,
        null,
        JSON.stringify(paymentResult)
      );
      await Payment.updateTransactionStatus(transaction.transaction_id, 'FAILED');

      res.status(400).json({
        success: false,
        message: paymentResult.message || 'Payment failed',
        data: { transactionId: transaction.transaction_id }
      });
    }
  } catch (error) {
    console.error('processDigitalPayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to process payment' });
  }
};

// PS-2: Check COD eligibility
exports.checkCODEligibility = async (req, res) => {
  try {
    const { orderAmount, farmerId } = req.body;
    const userId = req.user.userId;

    if (!orderAmount) {
      return res.status(400).json({ success: false, message: 'Order amount is required' });
    }

    const eligibility = await Payment.checkCODEligibility(userId, parseFloat(orderAmount), farmerId);
    res.json({ success: true, data: eligibility });
  } catch (error) {
    console.error('checkCODEligibility error:', error);
    res.status(500).json({ success: false, message: 'Failed to check COD eligibility' });
  }
};

// PS-2: Process COD order
exports.processCODOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.userId;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    // Get order details
    const order = await Order.getOrderDetails(orderId, userId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.payment_type !== 'COD') {
      return res.status(400).json({ success: false, message: 'This order is not COD' });
    }

    // Create COD transaction (pending until delivery confirmation)
    const transaction = await Payment.createTransaction(
      orderId,
      'COD',
      order.total_amount,
      null,
      'COD - Payment pending delivery'
    );

    // For COD, we don't record earnings until delivery is confirmed
    // The ledger entry will be created when order status changes to DELIVERED

    res.json({
      success: true,
      message: 'COD order confirmed',
      data: { transactionId: transaction.transaction_id }
    });
  } catch (error) {
    console.error('processCODOrder error:', error);
    res.status(500).json({ success: false, message: 'Failed to process COD order' });
  }
};

// PS-2: Confirm COD payment (when order is delivered)
exports.confirmCODPayment = async (req, res) => {
  try {
    const { orderId, receivedAmount } = req.body;
    const userId = req.user.userId;

    // This should be called by farmer/admin when order is delivered
    // For now, we'll allow farmers to confirm their own COD orders
    const order = await Order.getOrderDetails(orderId, userId);
    if (!order || order.farmer_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (order.payment_type !== 'COD') {
      return res.status(400).json({ success: false, message: 'This order is not COD' });
    }

    // Get transaction
    const transaction = await Payment.getTransactionByOrderId(orderId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Payment transaction not found' });
    }

    const received = parseFloat(receivedAmount || order.total_amount);

    // Update transaction status
    await Payment.updateTransactionStatus(transaction.transaction_id, 'COMPLETED', `COD payment received: ₱${received}`);

    // Record earning in farmer ledger (PS-3)
    // For COD, farmer collects full amount, but owes commission
    const commissionSettings = await Payment.getCommissionRate();
    const commissionRate = commissionSettings.rate;
    const commissionAmount = received * commissionRate;
    const earningAmount = received - commissionAmount;

    await Payment.addLedgerEntry(
      order.farmer_id,
      orderId,
      'EARNING',
      earningAmount,
      `Order ${order.order_number} - COD Gross earning`
    );

    await Payment.addLedgerEntry(
      order.farmer_id,
      orderId,
      'COMMISSION',
      -commissionAmount,
      `Order ${order.order_number} - COD Commission owed (${commissionRate * 100}%)`
    );

    res.json({
      success: true,
      message: 'COD payment confirmed',
      data: {
        receivedAmount: received,
        commissionAmount: commissionAmount,
        netAmount: earningAmount
      }
    });
  } catch (error) {
    console.error('confirmCODPayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm COD payment' });
  }
};

// PS-3: Get farmer ledger
exports.getFarmerLedger = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    const ledger = await Payment.getFarmerLedger(userId, parseInt(limit), parseInt(offset));
    const balance = await Payment.getFarmerBalance(userId);

    res.json({
      success: true,
      data: {
        ledger,
        currentBalance: balance
      }
    });
  } catch (error) {
    console.error('getFarmerLedger error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ledger' });
  }
};

// PS-3: Get farmer payouts
exports.getFarmerPayouts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    const payouts = await Payment.getFarmerPayouts(userId, parseInt(limit), parseInt(offset));
    const balance = await Payment.getFarmerBalance(userId);

    res.json({
      success: true,
      data: {
        payouts,
        currentBalance: balance
      }
    });
  } catch (error) {
    console.error('getFarmerPayouts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payouts' });
  }
};

// PS-2: Get/Update COD settings (Farmer)
exports.getCODSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const settings = await Payment.getCODSettings(userId);
    res.json({ success: true, data: settings || { is_enabled: false } });
  } catch (error) {
    console.error('getCODSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch COD settings' });
  }
};

exports.updateCODSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const settings = await Payment.updateCODSettings(userId, req.body);
    res.json({ success: true, message: 'COD settings updated', data: settings });
  } catch (error) {
    console.error('updateCODSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update COD settings' });
  }
};

// PS-3: Request payout (Farmer)
exports.requestPayout = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payout amount is required' });
    }

    if (!bankDetails || !bankDetails.account_number || !bankDetails.bank_name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bank account number and bank name are required' 
      });
    }

    const payout = await Payment.requestPayout(userId, amount, bankDetails);
    
    // Create ledger entry for payout request (negative balance)
    await Payment.addLedgerEntry(
      userId,
      null,
      'PAYOUT',
      -parseFloat(amount),
      `Payout request #${payout.payout_id}`
    );

    res.json({ 
      success: true, 
      message: 'Payout request submitted successfully',
      data: payout 
    });
  } catch (error) {
    console.error('requestPayout error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to request payout' 
    });
  }
};

// Helper function to simulate payment gateway (PS-1 placeholder)
async function simulatePaymentGateway(amount, paymentDetails) {
  // This is a placeholder for actual Stripe integration
  // In production, this would call Stripe API:
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // const paymentIntent = await stripe.paymentIntents.create({...});

  // Simulate payment processing
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate 95% success rate
      if (Math.random() > 0.05) {
        resolve({
          success: true,
          transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: 'Payment processed successfully'
        });
      } else {
        resolve({
          success: false,
          message: 'Payment failed - insufficient funds or card declined'
        });
      }
    }, 1000);
  });
}

