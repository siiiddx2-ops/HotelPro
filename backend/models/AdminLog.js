const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true, maxlength: 100 },
  entityType: { type: String, required: true, maxlength: 50 },
  entityId: { type: String, default: '' },
  details: { type: String, default: '', maxlength: 1000 }
}, { timestamps: true });

adminLogSchema.index({ createdAt: -1 });
module.exports = mongoose.model('AdminLog', adminLogSchema);
