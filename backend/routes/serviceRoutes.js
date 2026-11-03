const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const ServiceRequest = require('../models/ServiceRequest');
const { protect, authorize } = require('../middleware/auth');
const { notifyHotelTeam, notifyUsers, writeLog } = require('../utils/activity');

const router = express.Router();
const CATEGORIES = ['Housekeeping', 'Room Service', 'Maintenance', 'Concierge', 'Other'];
const TRANSITIONS = { Open: ['Assigned', 'In Progress', 'Cancelled'], Assigned: ['In Progress', 'Completed', 'Cancelled'], 'In Progress': ['Completed', 'Cancelled'], Completed: [], Cancelled: [] };

router.get('/mine', protect, async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ guest: req.user._id }).populate('room', 'roomNumber title').populate('assignedTo', 'name').sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Unable to load service requests' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { bookingId, category, details, priority = 'Normal' } = req.body || {};
    if (!mongoose.isValidObjectId(bookingId)) return res.status(400).json({ message: 'Choose a valid reservation' });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ message: 'Choose a valid service type' });
    if (typeof details !== 'string' || details.trim().length < 3 || details.trim().length > 1000) return res.status(400).json({ message: 'Request details must be 3–1,000 characters' });
    if (!['Normal', 'High'].includes(priority)) return res.status(400).json({ message: 'Invalid request priority' });

    const booking = await Booking.findOne({ _id: bookingId, user: req.user._id }).populate('room', 'title roomNumber');
    if (!booking) return res.status(404).json({ message: 'Reservation not found' });
    if (!['Confirmed', 'Checked-In'].includes(booking.bookingStatus)) return res.status(409).json({ message: 'Service requests are available for current confirmed stays' });

    const request = await ServiceRequest.create({ booking: booking._id, guest: req.user._id, room: booking.room._id, category, details: details.trim(), priority });
    await notifyHotelTeam('New guest request', `${category} for room ${booking.room.roomNumber}: ${details.trim().slice(0, 120)}`, 'service', '/admin-dashboard#services');
    await writeLog(req.user, 'service.request.created', 'ServiceRequest', request._id, category);
    res.status(201).json(request);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Unable to create service request' });
  }
});

router.get('/', protect, authorize('staff', 'admin'), async (req, res) => {
  try {
    const status = CATEGORIES.includes(req.query.category) ? { category: req.query.category } : {};
    const requests = await ServiceRequest.find(status).populate('guest', 'name email phone').populate('room', 'roomNumber title').populate('assignedTo', 'name').sort({ priority: -1, createdAt: -1 }).limit(200);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Unable to load service desk' });
  }
});

router.put('/:id', protect, authorize('staff', 'admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid request id' });
    const { status, assignedTo } = req.body || {};
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Service request not found' });

    if (status && !TRANSITIONS[request.status]?.includes(status)) return res.status(409).json({ message: `Cannot change a ${request.status} request to ${status}` });
    if (assignedTo && assignedTo !== 'me' && !mongoose.isValidObjectId(assignedTo)) return res.status(400).json({ message: 'Invalid staff member' });
    if (status) {
      request.status = status;
      if (status === 'Completed') request.completedAt = new Date();
    }
    if (assignedTo === 'me' || (status === 'Assigned' && !request.assignedTo)) request.assignedTo = req.user._id;
    await request.save();
    await request.populate([{ path: 'guest', select: 'name' }, { path: 'room', select: 'roomNumber title' }, { path: 'assignedTo', select: 'name' }]);
    await notifyUsers([request.guest], 'Service request updated', `Your ${request.category.toLowerCase()} request is ${request.status.toLowerCase()}.`, 'service', '/guest-dashboard#services');
    await writeLog(req.user, `service.request.${status || 'assigned'}`, 'ServiceRequest', request._id, request.status);
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Unable to update service request' });
  }
});

module.exports = router;
