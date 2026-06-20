const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['register', 'resetPassword'],
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL 索引，过期自动删除
  },
}, { timestamps: true });

// 同一邮箱同一类型同时只能有一个有效验证码
verificationCodeSchema.index({ email: 1, type: 1, used: 1 });

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
