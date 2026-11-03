const express = require('express');
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const sampleRooms = require('../data/sampleRooms');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const ACTIVE_BOOKING_STATUSES = ['Confirmed', 'Checked-In'];
const ROOM_CATEGORIES = ['Standard', 'Deluxe', 'Suite', 'Presidential'];
const ROOM_FIELDS = ['roomNumber', 'title', 'city', 'country', 'category', 'pricePerNight', 'seasonalRates', 'capacity', 'amenities', 'images', 'description', 'freeCancellationUntilCheckIn', 'status'];
const { calculateStayPrice, dateOnlyUtc } = require('../utils/pricing');

const isValidDate = (value) => value && !Number.isNaN(new Date(value).getTime());

router.get('/', async (req, res) => {
  try {
    const { category, maxPrice, checkIn, checkOut, guestsCount, destination } = req.query;
    const query = {};

    if (typeof destination === 'string' && destination.trim()) {
      const escapedDestination = destination.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const destinationPattern = new RegExp(escapedDestination, 'i');
      query.$or = [
        { city: destinationPattern },
        { country: destinationPattern },
        { title: destinationPattern },
        { description: destinationPattern }
      ];
    }

    if (category && category !== 'All') {
      if (!ROOM_CATEGORIES.includes(category)) return res.status(400).json({ message: 'Invalid room category' });
      query.category = category;
    }
    if (maxPrice !== undefined) {
      const price = Number(maxPrice);
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'Maximum price must be a positive number' });
      query.pricePerNight = { $lte: price };
    }
    if (guestsCount !== undefined) {
      const guests = Number(guestsCount);
      if (!Number.isInteger(guests) || guests < 1) return res.status(400).json({ message: 'Guest count must be a positive whole number' });
      query.capacity = { $gte: guests };
    }

    if (checkIn || checkOut) {
      if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
        return res.status(400).json({ message: 'Both check-in and check-out dates are required' });
      }
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      if (checkOutDate <= checkInDate) return res.status(400).json({ message: 'Check-out must be after check-in' });
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (checkInDate < today) return res.status(400).json({ message: 'Check-in cannot be in the past' });

      query.status = { $nin: ['Maintenance', 'Cleaning'] };
      const bookedRoomIds = await Booking.distinct('room', {
        bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
        checkInDate: { $lt: checkOutDate },
        checkOutDate: { $gt: checkInDate }
      });
      query._id = { $nin: bookedRoomIds };
    } else {
      query.status = 'Available';
    }

    const rooms = await Room.find(query).sort({ roomNumber: 1 });
    const roomIds = rooms.map(room => room._id);
    const reviewStats = roomIds.length ? await Review.aggregate([
      { $match: { room: { $in: roomIds } } },
      { $group: { _id: '$room', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
    ]) : [];
    const statsByRoomId = new Map(reviewStats.map(stat => [stat._id.toString(), stat]));
    res.json(rooms.map(room => {
      const stats = statsByRoomId.get(room._id.toString());
      const stayPrice = checkIn && checkOut ? calculateStayPrice(room, checkIn, checkOut) : null;
      return {
        ...room.toObject(),
        ...(stayPrice ? { estimatedTotal: stayPrice.total, averageNightlyRate: stayPrice.averageNightlyRate } : {}),
        averageRating: stats?.averageRating || null,
        reviewCount: stats?.reviewCount || 0
      };
    }));
  } catch (err) {
    res.status(500).json({ message: 'Unable to load rooms' });
  }
});

router.get('/manage', protect, authorize('staff', 'admin'), async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Unable to load rooms' });
  }
});

router.post('/seed', protect, authorize('admin'), async (req, res) => {
  try {
    const results = await Promise.all(sampleRooms.map(room => Room.updateOne(
      { roomNumber: room.roomNumber },
      { $setOnInsert: { ...room, status: 'Available' } },
      { upsert: true }
    )));
    const added = results.reduce((total, result) => total + (result.upsertedCount || 0), 0);
    res.status(200).json({ message: added ? `${added} demo rooms added` : 'The demo collection is already complete', added });
  } catch (err) {
    res.status(500).json({ message: 'Unable to seed sample rooms' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid room id' });
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const reviews = await Review.find({ room: room._id }).populate('user', 'name').sort({ createdAt: -1 });
    res.json({ room, reviews });
  } catch (err) {
    res.status(500).json({ message: 'Unable to load room details' });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Room number already exists' });
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(400).json({ message: 'Unable to create room' });
  }
});

router.put('/:id', protect, authorize('staff', 'admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid room id' });
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => ROOM_FIELDS.includes(key)));
    if (req.user.role === 'staff' && Object.keys(updates).some(key => key !== 'status')) {
      return res.status(403).json({ message: 'Only an administrator can edit room details or rates' });
    }
    if (updates.status === 'Available' && await Booking.exists({ room: req.params.id, bookingStatus: 'Checked-In' })) {
      return res.status(409).json({ message: 'A room with a checked-in guest cannot be marked available' });
    }
    const room = await Room.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(400).json({ message: 'Unable to update room' });
  }
});

router.post('/:id/seasonal-rates', protect, authorize('admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid room id' });
    const { label, startDate, endDate, pricePerNight } = req.body || {};
    const start = dateOnlyUtc(startDate);
    const end = dateOnlyUtc(endDate);
    const price = Number(pricePerNight);
    if (typeof label !== 'string' || !label.trim() || label.trim().length > 60 || !start || !end || end <= start || !Number.isFinite(price) || price < 1) {
      return res.status(400).json({ message: 'Enter a label, valid date range, and a positive nightly rate' });
    }
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const overlaps = room.seasonalRates.some(rate => {
      const savedStart = dateOnlyUtc(rate.startDate);
      const savedEnd = dateOnlyUtc(rate.endDate);
      return savedStart && savedEnd && start < savedEnd && end > savedStart;
    });
    if (overlaps) return res.status(409).json({ message: 'This date range overlaps another seasonal rate for the room' });
    room.seasonalRates.push({ label: label.trim(), startDate: start, endDate: end, pricePerNight: price });
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ message: 'Unable to save seasonal pricing' });
  }
});

router.delete('/:id/seasonal-rates/:rateId', protect, authorize('admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.rateId)) return res.status(400).json({ message: 'Invalid room or rate id' });
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    room.seasonalRates = room.seasonalRates.filter(rate => rate._id.toString() !== req.params.rateId);
    await room.save();
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Unable to remove seasonal rate' });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid room id' });
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (await Booking.exists({ room: room._id })) {
      return res.status(409).json({ message: 'Rooms with booking history cannot be deleted' });
    }
    await Review.deleteMany({ room: room._id });
    await room.deleteOne();
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Unable to delete room' });
  }
});

router.post('/:id/reviews', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid room id' });
    const { rating, comment } = req.body || {};
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5 || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({ message: 'Choose a rating and enter a review comment' });
    }
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const completedStay = await Booking.exists({
      user: req.user._id,
      room: room._id,
      bookingStatus: 'Checked-Out'
    });
    if (!completedStay) return res.status(403).json({ message: 'You can review a room after checking out' });

    const review = await Review.create({
      user: req.user._id,
      room: room._id,
      rating: numericRating,
      comment: comment.trim()
    });
    await review.populate('user', 'name');
    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You have already reviewed this room' });
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Unable to submit review' });
  }
});

module.exports = router;
