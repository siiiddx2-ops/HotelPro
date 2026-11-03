const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { protect, authorize } = require('../middleware/auth');
const { notifyHotelTeam, notifyUsers, writeLog } = require('../utils/activity');
const { calculateStayPrice } = require('../utils/pricing');

const router = express.Router();
const ACTIVE_BOOKING_STATUSES = ['Confirmed', 'Checked-In'];

const isValidDate = (value) => value && !Number.isNaN(new Date(value).getTime());

const updateRoomForBookingStatus = async (roomId, bookingStatus) => {
  const room = await Room.findById(roomId);
  if (!room) return;

  if (bookingStatus === 'Checked-In') room.status = 'Occupied';
  else if (bookingStatus === 'Checked-Out') room.status = 'Cleaning';
  else return;

  await room.save();
};

router.post('/', protect, async (req, res) => {
  try {
    const { roomId, checkInDate, checkOutDate, guestsCount = 1, specialRequests = '' } = req.body || {};
    if (!mongoose.isValidObjectId(roomId)) {
      return res.status(400).json({ message: 'A valid room is required' });
    }
    if (!isValidDate(checkInDate) || !isValidDate(checkOutDate)) {
      return res.status(400).json({ message: 'Valid check-in and check-out dates are required' });
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (checkIn < today) return res.status(400).json({ message: 'Check-in cannot be in the past' });
    if (checkOut <= checkIn) return res.status(400).json({ message: 'Check-out must be after check-in' });

    const guestCount = Number(guestsCount);
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      return res.status(400).json({ message: 'Guest count must be a positive whole number' });
    }
    if (typeof specialRequests !== 'string' || specialRequests.length > 2000) {
      return res.status(400).json({ message: 'Special requests must be text under 2,000 characters' });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.status === 'Maintenance' || room.status === 'Cleaning') {
      return res.status(409).json({ message: 'This room is currently unavailable' });
    }
    if (guestCount > room.capacity) {
      return res.status(400).json({ message: `This room accommodates up to ${room.capacity} guests` });
    }

    const overlappingBooking = await Booking.exists({
      room: room._id,
      bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn }
    });
    if (overlappingBooking) {
      return res.status(409).json({ message: 'This room is already booked for the selected dates' });
    }

    const nights = Math.ceil((checkOut - checkIn) / (24 * 60 * 60 * 1000));
    const booking = await Booking.create({
      user: req.user._id,
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guestsCount: guestCount,
      totalAmount: calculateStayPrice(room, checkIn, checkOut).total,
      specialRequests: specialRequests.trim(),
      paymentStatus: 'Pending'
    });
    await notifyUsers([req.user], 'Your stay is confirmed', `Your reservation is confirmed for ${room.title}.`, 'booking', '/guest-dashboard');
    await notifyHotelTeam('New room reservation', `${req.user.name} booked ${room.title} for ${guestCount} guest${guestCount === 1 ? '' : 's'}.`, 'booking');
    await writeLog(req.user, 'booking.created', 'Booking', booking._id, room.title);
    res.status(201).json(booking);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Unable to create booking' });
  }
});

router.get('/my-bookings', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('room', 'roomNumber title category city country pricePerNight seasonalRates images freeCancellationUntilCheckIn')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Unable to load bookings' });
  }
});

router.get('/', protect, authorize('staff', 'admin'), async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber title category city country pricePerNight seasonalRates images freeCancellationUntilCheckIn')
      .sort({ checkInDate: 1, createdAt: -1 }).limit(500);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Unable to load bookings' });
  }
});

router.get('/:id/invoice', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid booking id' });
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber title category city country pricePerNight');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const isOwner = booking.user._id.toString() === req.user._id.toString();
    const isStaff = ['staff', 'admin'].includes(req.user.role);
    if (!isOwner && !isStaff) return res.status(403).json({ message: 'You cannot view this invoice' });
    res.json({ invoiceNumber: `HP-${booking._id.toString().slice(-8).toUpperCase()}`, booking });
  } catch (err) {
    res.status(500).json({ message: 'Unable to load invoice' });
  }
});

router.put('/:id/payment-method', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid booking id' });
    const { method } = req.body || {};
    if (!['cash', 'razorpay'].includes(method)) return res.status(400).json({ message: 'Choose online payment or cash at the hotel' });

    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!ACTIVE_BOOKING_STATUSES.includes(booking.bookingStatus) || booking.paymentStatus !== 'Pending') {
      return res.status(409).json({ message: 'Payment method can only be changed for an unpaid active reservation' });
    }
    if (method === 'razorpay' && (!Number.isFinite(Number(booking.totalAmount)) || Number(booking.totalAmount) < 1)) {
      return res.status(400).json({ message: 'Online payments must be at least ₹1.00. Please contact the hotel to correct this reservation total.' });
    }

    booking.paymentMethod = method;
    await booking.save();
    res.json({ message: 'Payment method updated', booking });
  } catch (err) {
    res.status(500).json({ message: 'Unable to update payment method' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid booking id' });
    const { checkInDate, checkOutDate, guestsCount } = req.body || {};
    if (!isValidDate(checkInDate) || !isValidDate(checkOutDate)) return res.status(400).json({ message: 'Valid check-in and check-out dates are required' });
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.bookingStatus !== 'Confirmed' || new Date(booking.checkInDate) <= new Date(new Date().setUTCHours(0, 0, 0, 0))) {
      return res.status(409).json({ message: 'Only future confirmed reservations can be changed' });
    }
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const guestCount = Number(guestsCount);
    if (checkIn < today || checkOut <= checkIn) return res.status(400).json({ message: 'Choose a future check-in and a later check-out' });
    if (!Number.isInteger(guestCount) || guestCount < 1) return res.status(400).json({ message: 'Guest count must be a positive whole number' });
    const room = await Room.findById(booking.room);
    if (!room) return res.status(404).json({ message: 'Room no longer exists' });
    if (guestCount > room.capacity) return res.status(400).json({ message: `This room accommodates up to ${room.capacity} guests` });
    const collision = await Booking.exists({
      _id: { $ne: booking._id }, room: room._id, bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
      checkInDate: { $lt: checkOut }, checkOutDate: { $gt: checkIn }
    });
    if (collision) return res.status(409).json({ message: 'This room is already reserved for those dates' });
    const nights = Math.ceil((checkOut - checkIn) / 86400000);
    booking.checkInDate = checkIn;
    booking.checkOutDate = checkOut;
    booking.guestsCount = guestCount;
    booking.totalAmount = calculateStayPrice(room, checkIn, checkOut).total;
    await booking.save();
    await notifyUsers([req.user], 'Reservation updated', `Your dates for ${room.title} have been updated.`, 'booking', '/guest-dashboard');
    await notifyHotelTeam('Reservation dates changed', `Reservation ${booking._id.toString().slice(-6)} was updated by the guest.`, 'booking');
    await writeLog(req.user, 'booking.updated', 'Booking', booking._id, `${nights} nights`);
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Unable to update reservation' });
  }
});

router.put('/:id/cancel', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only cancel your own bookings' });
    }
    if (booking.bookingStatus !== 'Confirmed') {
      return res.status(400).json({ message: 'Only confirmed bookings can be cancelled' });
    }
    const room = await Room.findById(booking.room);
    if (room?.freeCancellationUntilCheckIn === false) {
      return res.status(400).json({ message: 'This booking does not include free cancellation' });
    }
    if (new Date(booking.checkInDate) <= new Date(new Date().setUTCHours(0, 0, 0, 0))) {
      return res.status(400).json({ message: 'Bookings can only be cancelled before check-in' });
    }

    booking.bookingStatus = 'Cancelled';
    if (booking.paymentStatus === 'Paid') booking.refundStatus = 'Requested';
    await booking.save();
    await notifyUsers([req.user], 'Reservation cancelled', booking.paymentStatus === 'Paid' ? 'Your reservation was cancelled. The hotel team will process your refund request.' : 'Your reservation was cancelled.', 'booking', '/guest-dashboard');
    await notifyHotelTeam('Guest cancelled a reservation', `Reservation ${booking._id.toString().slice(-6)} was cancelled.`, 'booking');
    await writeLog(req.user, 'booking.cancelled', 'Booking', booking._id, booking.paymentStatus === 'Paid' ? 'Refund requested' : 'Unpaid');
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Unable to cancel booking' });
  }
});

router.put('/:id/status', protect, authorize('staff', 'admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }
    const { bookingStatus } = req.body || {};
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const allowedTransitions = {
      Confirmed: ['Checked-In', 'Cancelled'],
      'Checked-In': ['Checked-Out'],
      'Checked-Out': [],
      Cancelled: []
    };
    if (!allowedTransitions[booking.bookingStatus]?.includes(bookingStatus)) {
      return res.status(400).json({ message: `Cannot change a ${booking.bookingStatus} booking to ${bookingStatus}` });
    }

    booking.bookingStatus = bookingStatus;
    if (bookingStatus === 'Cancelled' && booking.paymentStatus === 'Paid') booking.refundStatus = 'Requested';
    await booking.save();
    await updateRoomForBookingStatus(booking.room, bookingStatus);
    await notifyUsers([booking.user], 'Reservation status updated', `Your reservation is now ${bookingStatus.toLowerCase()}.`, 'booking', '/guest-dashboard');
    await writeLog(req.user, `booking.${bookingStatus.toLowerCase().replace('-', '_')}`, 'Booking', booking._id);
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Unable to update booking status' });
  }
});

module.exports = router;
