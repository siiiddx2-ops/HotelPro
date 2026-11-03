const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 }
}, { timestamps: true });

reviewSchema.index({ user: 1, room: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
