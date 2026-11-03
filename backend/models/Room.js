const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  city: { type: String, trim: true, default: '' },
  country: { type: String, trim: true, default: 'India' },
  category: { type: String, enum: ['Standard', 'Deluxe', 'Suite', 'Presidential'], required: true },
  pricePerNight: { type: Number, required: true, min: 1 },
  seasonalRates: [{
    label: { type: String, required: true, trim: true, maxlength: 60 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    pricePerNight: { type: Number, required: true, min: 1 }
  }],
  capacity: { type: Number, required: true, min: 1 },
  amenities: [{ type: String }],
  images: [{ type: String }],
  description: { type: String, required: true, trim: true },
  freeCancellationUntilCheckIn: { type: Boolean, default: true },
  status: { type: String, enum: ['Available', 'Occupied', 'Maintenance', 'Cleaning'], default: 'Available' }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
