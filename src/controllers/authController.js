const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const LoginLog = require('../models/LoginLog');
const config = require('../config');
const validate = require('../middlewares/validator');
const { generateCode, sendVerificationCode } = require('../services/email');
const { verifyCaptcha } = require('../utils/captcha');

// 生成 token 对
function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
  return { accessToken, refreshToken };
}

// 发送验证码
const sendCode = [
  body('email').isEmail().withMessage('请输入有效的邮箱'),
  body('type').isIn(['register', 'resetPassword']).withMessage('类型无效'),
  validate,
  async (req, res, next) => {
    try {
      const { email, type, captchaToken, captchaAnswer } = req.body;

      // 人机验证（如果提供了 captcha 就校验，没提供也放行—Lull 前端有自己的 checkbox）
      if (captchaToken && captchaAnswer) {
        if (!verifyCaptcha(captchaToken, captchaAnswer)) {
          return res.status(400).json({ error: '人机验证失败，请重新输入' });
        }
      }

      // 检查是否已注册（注册时）
      if (type === 'register') {
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ error: '该邮箱已注册' });
      }

      // 检查是否已注册（重置密码时）
      if (type === 'resetPassword') {
        const existing = await User.findOne({ email });
        if (!existing) return res.status(404).json({ error: '该邮箱未注册' });
      }

      // 检查发送频率（60秒内只能发一次）
      const recent = await VerificationCode.findOne({
        email, type, used: false,
        createdAt: { $gte: new Date(Date.now() - 60000) },
      });
      if (recent) return res.status(429).json({ error: '验证码已发送，请60秒后再试' });

      // 生成并保存验证码
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟
      await VerificationCode.create({ email, code, type, expiresAt });

      // 发送邮件
      const sent = await sendVerificationCode(email, code, type);

      res.json({
        message: '验证码已发送',
        ...(!sent ? { code, hint: '邮件发送失败，验证码直接返回' } : {}),
      });
    } catch (err) {
      next(err);
    }
  },
];

// 验证码注册（必须有邀请码）
const register = [
  body('email').isEmail().withMessage('请输入有效的邮箱'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('验证码为6位数字'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
  body('inviteCode').notEmpty().withMessage('请输入邀请码'),
  body('nickname').optional().trim(),
  validate,
  async (req, res, next) => {
    try {
      const { email, code, password, nickname, inviteCode } = req.body;

      // 检查是否已注册
      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ error: '该邮箱已注册' });

      // 验证邀请码
      const InviteCode = require('../models/InviteCode');
      const invite = await InviteCode.findOne({ code: inviteCode.toUpperCase(), isActive: true });
      if (!invite) return res.status(400).json({ error: '邀请码无效' });
      if (invite.expiresAt && invite.expiresAt < new Date()) return res.status(400).json({ error: '邀请码已过期' });
      if (invite.usedCount >= invite.maxUses) return res.status(400).json({ error: '邀请码已用完' });

      // 验证验证码
      const record = await VerificationCode.findOne({
        email, type: 'register', used: false,
      }).sort({ createdAt: -1 });

      if (!record) return res.status(400).json({ error: '请先获取验证码' });
      if (record.expiresAt < new Date()) return res.status(400).json({ error: '验证码已过期，请重新获取' });
      if (record.attempts >= 5) return res.status(400).json({ error: '验证码尝试次数过多，请重新获取' });

      if (record.code !== code) {
        record.attempts += 1;
        await record.save();
        return res.status(400).json({ error: '验证码错误' });
      }

      // 标记验证码已使用
      record.used = true;
      await record.save();

      // 创建用户
      const passwordHash = await User.hashPassword(password);
      const user = await User.create({
        email, passwordHash,
        nickname: nickname || '',
        emailVerified: true,
      });

      // 更新邀请码
      invite.usedCount += 1;
      invite.usedBy.push(user._id);
      await invite.save();

      const tokens = generateTokens(user._id);
      res.status(201).json({ user, ...tokens });
    } catch (err) {
      next(err);
    }
  },
];

// 登录
const login = [
  body('email').isEmail().withMessage('请输入有效的邮箱'),
  body('password').notEmpty().withMessage('请输入密码'),
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.connection?.remoteAddress || '';

      const user = await User.findOne({ email });
      if (!user) {
        await LoginLog.create({ email, ip, success: false, reason: '用户不存在' });
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      // 检查账户锁定
      if (user.isLocked()) {
        const remainMin = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(423).json({ error: `账户已锁定，请${remainMin}分钟后再试` });
      }

      // 验证密码
      const valid = await user.comparePassword(password);
      if (!valid) {
        await user.incrementLoginAttempts();
        await LoginLog.create({ userId: user._id, email, ip, success: false, reason: '密码错误' });
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      // 登录成功，重置失败次数
      await user.resetLoginAttempts();
      user.lastLoginAt = new Date();
      user.lastLoginIp = ip;
      await user.save();

      await LoginLog.create({ userId: user._id, email, ip, success: true });

      const tokens = generateTokens(user._id);
      res.json({ user, ...tokens });
    } catch (err) {
      next(err);
    }
  },
];

// 重置密码
const resetPassword = [
  body('email').isEmail().withMessage('请输入有效的邮箱'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('验证码为6位数字'),
  body('newPassword').isLength({ min: 6 }).withMessage('密码至少6位'),
  validate,
  async (req, res, next) => {
    try {
      const { email, code, newPassword } = req.body;

      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: '该邮箱未注册' });

      // 验证验证码
      const record = await VerificationCode.findOne({
        email, type: 'resetPassword', used: false,
      }).sort({ createdAt: -1 });

      if (!record) return res.status(400).json({ error: '请先获取验证码' });
      if (record.expiresAt < new Date()) return res.status(400).json({ error: '验证码已过期，请重新获取' });
      if (record.attempts >= 5) return res.status(400).json({ error: '验证码尝试次数过多，请重新获取' });

      if (record.code !== code) {
        record.attempts += 1;
        await record.save();
        return res.status(400).json({ error: '验证码错误' });
      }

      record.used = true;
      await record.save();

      // 更新密码
      user.passwordHash = await User.hashPassword(newPassword);
      await user.resetLoginAttempts();
      await user.save();

      res.json({ message: '密码重置成功' });
    } catch (err) {
      next(err);
    }
  },
];

// 刷新 token
const refresh = [
  body('refreshToken').notEmpty().withMessage('请提供 refresh token'),
  validate,
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      const payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const user = await User.findById(payload.userId);
      if (!user) return res.status(401).json({ error: '用户不存在' });

      const tokens = generateTokens(user._id);
      res.json(tokens);
    } catch (err) {
      if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Refresh token 已过期，请重新登录' });
      return res.status(401).json({ error: '无效的 refresh token' });
    }
  },
];

// 登录历史
const loginHistory = async (req, res, next) => {
  try {
    const logs = await LoginLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendCode, register, login, resetPassword, refresh, loginHistory };
