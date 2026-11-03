const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'INR', uppercase: true, trim: true },
  method: { type: String, enum: ['razorpay', 'cash', 'card-at-property', 'other'], required: true },
  status: { type: String, enum: ['Created', 'Paid', 'Refund Pending', 'Refunded', 'Failed'], default: 'Created' },
  orderId: { type: String, default: '', index: true },
  transactionId: { type: String, default: '' },
  signatureVerified: { type: Boolean, default: false },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes: { type: String, default: '', maxlength: 500 }
}, { timestamps: true });

paymentSchema.index({ booking: 1, status: 1 });
module.exports = mongoose.model('Payment', paymentSchema);
