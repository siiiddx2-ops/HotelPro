const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  kind: { type: String, enum: ['booking', 'payment', 'service', 'system'], default: 'system' },
  link: { type: String, default: '/' },
  readAt: { type: Date, default: null }
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', notificationSchema);
