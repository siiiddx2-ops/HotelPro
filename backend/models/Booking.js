const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  guestsCount: { type: Number, required: true, default: 1, min: 1 },
  totalAmount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['cash', 'razorpay'], default: 'cash' },
  bookingStatus: { type: String, enum: ['Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled'], default: 'Confirmed' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Refunded'], default: 'Pending' },
  refundStatus: { type: String, enum: ['NotRequested', 'Requested', 'Processing', 'Refunded', 'Rejected'], default: 'NotRequested' },
  paymentId: { type: String, default: '' },
  specialRequests: { type: String, default: '' }
}, { timestamps: true });

bookingSchema.index({ room: 1, bookingStatus: 1, checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
