const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  ip: {
    type: String,
    default: '',
  },
  userAgent: {
    type: String,
    default: '',
  },
  success: {
    type: Boolean,
    required: true,
  },
  reason: {
    type: String,
    default: '',
  },
}, { timestamps: true });

loginLogSchema.index({ userId: 1, createdAt: -1 });
loginLogSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('LoginLog', loginLogSchema);
