const express = require('express');
const https = require('https');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { protect, authorize } = require('../middleware/auth');
const { notifyHotelTeam, notifyUsers, writeLog } = require('../utils/activity');

const router = express.Router();
const gatewayEnabled = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const credentials = () => Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

function razorpayRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'api.razorpay.com', path, method,
      headers: {
        Authorization: `Basic ${credentials()}`,
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(JSON.stringify(body)) } : {})
      }
    }, response => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        let parsed;
        try { parsed = data ? JSON.parse(data) : {}; } catch { parsed = {}; }
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(parsed.error?.description || 'Payment gateway request failed'));
        resolve(parsed);
      });
    });
    request.setTimeout(15000, () => request.destroy(new Error('Payment gateway timed out')));
    request.on('error', reject);
    if (body) request.write(JSON.stringify(body));
    request.end();
  });
}

router.get('/config', (req, res) => {
  res.json({ onlineEnabled: gatewayEnabled(), keyId: gatewayEnabled() ? process.env.RAZORPAY_KEY_ID : '', currency: 'INR' });
});

router.post('/order', protect, async (req, res) => {
  try {
    if (!gatewayEnabled()) return res.status(503).json({ message: 'Online payment is not configured. You can pay at the property.' });
    const { bookingId } = req.body || {};
    if (!mongoose.isValidObjectId(bookingId)) return res.status(400).json({ message: 'Choose a valid reservation' });
    const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Reservation not found' });
    if (!['Confirmed', 'Checked-In'].includes(booking.bookingStatus) || booking.paymentStatus !== 'Pending') return res.status(409).json({ message: 'This reservation is not awaiting payment' });

    const amount = Math.round(Number(booking.totalAmount) * 100);
    if (!Number.isSafeInteger(amount) || amount < 100) {
      return res.status(400).json({ message: 'Online payments must be at least ₹1.00' });
    }

    const order = await razorpayRequest('POST', '/v1/orders', {
      amount, currency: 'INR', receipt: `hp_${booking._id.toString().slice(-24)}`,
      notes: { bookingId: booking._id.toString(), guestId: req.user._id.toString() }
    });
    const payment = await Payment.create({ booking: booking._id, guest: req.user._id, amount: booking.totalAmount, currency: 'INR', method: 'razorpay', orderId: order.id, status: 'Created' });
    booking.paymentMethod = 'razorpay';
    await booking.save();
    res.status(201).json({ paymentId: payment._id, orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, guestName: req.user.name, guestEmail: req.user.email, guestPhone: req.user.phone });
  } catch (err) {
    console.error('Payment order failed:', err.message);
    res.status(500).json({ message: err.message || 'Unable to start online payment' });
  }
});

router.post('/verify', protect, async (req, res) => {
  try {
    if (!gatewayEnabled()) return res.status(503).json({ message: 'Online payment is not configured' });
    const { razorpay_order_id: orderId, razorpay_payment_id: transactionId, razorpay_signature: signature } = req.body || {};
    if (![orderId, transactionId, signature].every(value => typeof value === 'string' && value.length > 0 && value.length < 300)) return res.status(400).json({ message: 'Incomplete payment verification data' });
    const payment = await Payment.findOne({ orderId, guest: req.user._id, method: 'razorpay' });
    if (!payment) return res.status(404).json({ message: 'Payment order not found' });
    if (payment.status === 'Paid') return res.json({ message: 'Payment already verified', payment });

    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${transactionId}`).digest();
    let received;
    try { received = Buffer.from(signature, 'hex'); } catch { received = Buffer.alloc(0); }
    if (received.length !== expected.length || !crypto.timingSafeEqual(expected, received)) {
      payment.status = 'Failed';
      await payment.save();
      return res.status(400).json({ message: 'Payment signature could not be verified' });
    }

    const gatewayPayment = await razorpayRequest('GET', `/v1/payments/${encodeURIComponent(transactionId)}`);
    if (gatewayPayment.order_id !== orderId || gatewayPayment.amount !== Math.round(payment.amount * 100) || gatewayPayment.status !== 'captured') {
      return res.status(409).json({ message: 'Payment has not been captured for this reservation yet' });
    }
    const booking = await Booking.findOne({ _id: payment.booking, user: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Reservation not found' });
    payment.status = 'Paid';
    payment.transactionId = transactionId;
    payment.signatureVerified = true;
    await payment.save();
    booking.paymentStatus = 'Paid';
    booking.paymentId = transactionId;
    await booking.save();
    await notifyUsers([req.user], 'Payment received', `Your payment of ₹${payment.amount.toLocaleString('en-IN')} was verified.`, 'payment', '/guest-dashboard');
    await notifyHotelTeam('Guest payment received', `Booking ${booking._id} has been paid.`, 'payment');
    await writeLog(req.user, 'payment.verified', 'Booking', booking._id, transactionId);
    res.json({ message: 'Payment verified', payment, booking });
  } catch (err) {
    console.error('Payment verification failed:', err.message);
    res.status(502).json({ message: err.message || 'Unable to verify payment' });
  }
});

router.post('/:bookingId/cash', protect, authorize('staff', 'admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.bookingId)) return res.status(400).json({ message: 'Invalid reservation id' });
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Reservation not found' });
    if (booking.paymentStatus !== 'Pending') return res.status(409).json({ message: 'This reservation is not awaiting payment' });
    const payment = await Payment.create({ booking: booking._id, guest: booking.user, amount: booking.totalAmount, method: 'cash', status: 'Paid', recordedBy: req.user._id, notes: 'Received at property' });
    booking.paymentStatus = 'Paid';
    booking.paymentMethod = 'cash';
    booking.paymentId = payment._id.toString();
    await booking.save();
    await notifyUsers([booking.user], 'Payment recorded', `Payment at the property for reservation ${booking._id.toString().slice(-6)} has been recorded.`, 'payment', '/guest-dashboard');
    await writeLog(req.user, 'payment.cash.recorded', 'Booking', booking._id, payment._id);
    res.status(201).json({ message: 'Cash payment recorded', payment });
  } catch (err) {
    res.status(500).json({ message: 'Unable to record payment' });
  }
});

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const [payments, total] = await Promise.all([
      Payment.find().populate('guest', 'name email').populate('booking', 'bookingStatus checkInDate checkOutDate').populate('recordedBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Payment.countDocuments()
    ]);
    res.json({ payments, page, pages: Math.ceil(total / limit), total });
  } catch (err) {
    res.status(500).json({ message: 'Unable to load payment records' });
  }
});

router.post('/:bookingId/refund', protect, authorize('admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.bookingId)) return res.status(400).json({ message: 'Invalid reservation id' });
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Reservation not found' });
    if (booking.bookingStatus !== 'Cancelled' || booking.refundStatus !== 'Requested' || booking.paymentStatus !== 'Paid') {
      return res.status(409).json({ message: 'This reservation has no pending refund request' });
    }
    const payment = await Payment.findOne({ booking: booking._id, status: 'Paid' }).sort({ createdAt: -1 });
    if (!payment) return res.status(404).json({ message: 'Verified payment record not found' });

    if (payment.method === 'razorpay') {
      if (!gatewayEnabled() || !payment.transactionId) return res.status(503).json({ message: 'Gateway refund is unavailable for this payment' });
      booking.refundStatus = 'Processing';
      await booking.save();
      const refund = await razorpayRequest('POST', `/v1/payments/${encodeURIComponent(payment.transactionId)}/refund`, { amount: Math.round(payment.amount * 100) });
      payment.status = 'Refunded';
      payment.notes = `Gateway refund ${refund.id}`;
      booking.paymentStatus = 'Refunded';
      booking.refundStatus = 'Refunded';
    } else {
      payment.status = 'Refunded';
      payment.notes = 'Refund confirmed by hotel staff';
      booking.paymentStatus = 'Refunded';
      booking.refundStatus = 'Refunded';
    }
    await payment.save();
    await booking.save();
    await notifyUsers([booking.user], 'Refund processed', `The refund for reservation ${booking._id.toString().slice(-6)} has been marked complete.`, 'payment', '/guest-dashboard');
    await writeLog(req.user, 'payment.refund.processed', 'Booking', booking._id, payment.method);
    res.json({ message: 'Refund processed', booking, payment });
  } catch (err) {
    console.error('Refund failed:', err.message);
    res.status(502).json({ message: err.message || 'Unable to process refund' });
  }
});

module.exports = router;
