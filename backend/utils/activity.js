const AdminLog = require('../models/AdminLog');
const Notification = require('../models/Notification');
const User = require('../models/User');

async function writeLog(actor, action, entityType, entityId = '', details = '') {
  try {
    await AdminLog.create({ actor: actor?._id || actor || null, action, entityType, entityId: String(entityId || ''), details });
  } catch (error) {
    console.error('Activity log failed:', error.message);
  }
}

async function notifyUsers(users, title, message, kind = 'system', link = '/') {
  try {
    const ids = [...new Set((users || []).filter(Boolean).map(user => String(user._id || user)))];
    if (!ids.length) return;
    await Notification.insertMany(ids.map(user => ({ user, title, message, kind, link })));
  } catch (error) {
    console.error('Notification creation failed:', error.message);
  }
}

async function notifyHotelTeam(title, message, kind = 'booking', link = '/admin-dashboard') {
  const team = await User.find({ role: { $in: ['staff', 'admin'] } }).select('_id').lean();
  await notifyUsers(team, title, message, kind, link);
}

module.exports = { writeLog, notifyUsers, notifyHotelTeam };
