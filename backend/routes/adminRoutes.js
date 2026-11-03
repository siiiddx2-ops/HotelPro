const express = require('express');
const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const ServiceRequest = require('../models/ServiceRequest');
const AdminLog = require('../models/AdminLog');
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/auth');
const { writeLog } = require('../utils/activity');
const router = express.Router();

router.get('/stats', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    if (req.user.role === 'staff') {
      const [totalRooms, availableRooms, checkedIn, openRequests] = await Promise.all([
        Room.countDocuments(),
        Room.countDocuments({ status: 'Available' }),
        Booking.countDocuments({ bookingStatus: 'Checked-In' }),
        ServiceRequest.countDocuments({ status: { $in: ['Open', 'Assigned', 'In Progress'] } })
      ]);
      return res.json({ totalRooms, availableRooms, checkedIn, openRequests, occupancyRate: totalRooms ? Math.round((checkedIn / totalRooms) * 100) : 0 });
    }

    const [totalUsers, totalRooms, availableRooms, totalBookings, checkedIn, pendingPayments, openRequests, revenueResult] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Room.countDocuments({ status: 'Available' }),
      Booking.countDocuments(),
      Booking.countDocuments({ bookingStatus: 'Checked-In' }),
      Booking.countDocuments({ paymentStatus: 'Pending' }),
      ServiceRequest.countDocuments({ status: { $in: ['Open', 'Assigned', 'In Progress'] } }),
      Booking.aggregate([
        { $match: { paymentStatus: 'Paid', bookingStatus: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    res.json({ totalUsers, totalRooms, availableRooms, totalBookings, checkedIn, pendingPayments, openRequests, totalRevenue, occupancyRate: totalRooms ? Math.round((checkedIn / totalRooms) * 100) : 0 });
  } catch (err) {
    res.status(500).json({ message: 'Unable to load dashboard statistics' });
  }
});

router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Unable to load users' });
  }
});

router.post('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, phone = '', password, role = 'staff' } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ message: 'Name must be between 2 and 80 characters' });
    }
    if (typeof email !== 'string' || !email.trim() || email.trim().length > 254) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (typeof phone !== 'string' || phone.length > 30) {
      return res.status(400).json({ message: 'Phone number must be under 30 characters' });
    }
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
      return res.status(400).json({ message: 'Initial password must be between 12 and 128 characters' });
    }
    if (!['staff', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Team accounts must have staff or admin access' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role
    });
    await writeLog(req.user, 'user.created', 'User', user._id, `${role} account created`);
    const account = user.toObject();
    delete account.password;
    res.status(201).json(account);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'An account with this email already exists' });
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Unable to create team account' });
  }
});

router.put('/users/:id/role', protect, authorize('admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    const { role } = req.body || {};
    if (!['guest', 'staff', 'admin'].includes(role)) return res.status(400).json({ message: 'Choose a valid account role' });
    if (req.params.id === req.user._id.toString() && role !== 'admin') return res.status(409).json({ message: 'You cannot remove your own administrator access' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    await writeLog(req.user, 'user.role.updated', 'User', user._id, role);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Unable to update account role' });
  }
});

router.get('/reports', protect, authorize('admin'), async (req, res) => {
  try {
    const from = new Date();
    from.setUTCDate(1);
    from.setUTCMonth(from.getUTCMonth() - 5);
    from.setUTCHours(0, 0, 0, 0);
    const [monthlyRevenue, bookingStatuses, paymentMethods] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'Paid', createdAt: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$amount' }, payments: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Booking.aggregate([{ $group: { _id: '$bookingStatus', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Payment.aggregate([{ $group: { _id: { method: '$method', status: '$status' }, count: { $sum: 1 }, amount: { $sum: '$amount' } } }, { $sort: { '_id.method': 1 } }])
    ]);
    res.json({ monthlyRevenue, bookingStatuses, paymentMethods, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: 'Unable to generate hotel reports' });
  }
});

router.get('/activity', protect, authorize('admin'), async (req, res) => {
  try {
    const logs = await AdminLog.find().populate('actor', 'name email role').sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Unable to load audit history' });
  }
});

module.exports = router;
