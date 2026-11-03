const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  category: { type: String, enum: ['Housekeeping', 'Room Service', 'Maintenance', 'Concierge', 'Other'], required: true },
  details: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['Open', 'Assigned', 'In Progress', 'Completed', 'Cancelled'], default: 'Open' },
  priority: { type: String, enum: ['Normal', 'High'], default: 'Normal' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

serviceRequestSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
