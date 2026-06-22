const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  nickname: {
    type: String,
    trim: true,
    default: '',
  },
  avatar: {
    type: String,
    default: '',
  },
  level: {
    type: String,
    enum: ['初中', '高中', 'CET4', 'CET6', '考研', '雅思'],
    default: '初中',
  },
  goal: {
    type: String,
    enum: ['CET4', 'CET6', 'IELTS', 'TOEFL', 'general'],
    default: 'general',
  },
  settings: {
    dailyWordCount: { type: Number, default: 20 },
    dailyReadMin: { type: Number, default: 15 },
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'editor'],
    default: 'user',
  },
  // 新增字段
  emailVerified: {
    type: Boolean,
    default: false,
  },
  aiLimit: {
    type: Number,
    default: 1, // 每日默认 AI 生成次数限制为 1
  },
  aiGeneratedCountToday: {
    type: Number,
    default: 0, // 今日已生成文章次数
  },
  lastAiGeneratedAt: {
    type: Date,
    default: null, // 上次 AI 生成时间，用于跨天自动清零
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
  lastLoginIp: {
    type: String,
    default: '',
  },
  preferences: {
    dailyGoalMin: { type: Number, default: 30 },
    reminderTime: { type: String, default: '09:00' },
    sentenceHighlight: { type: Boolean, default: true },
  },
}, { timestamps: true });

// 隐藏密码哈希
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

// 密码验证
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// 注册时哈希密码
userSchema.statics.hashPassword = async function (password) {
  return bcrypt.hash(password, 10);
};

// 检查账户是否被锁定
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// 记录登录失败
userSchema.methods.incrementLoginAttempts = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 15 * 60 * 1000; // 15分钟

  this.loginAttempts += 1;
  if (this.loginAttempts >= MAX_ATTEMPTS) {
    this.lockUntil = new Date(Date.now() + LOCK_TIME);
  }
  return this.save();
};

// 重置登录失败次数
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = null;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
