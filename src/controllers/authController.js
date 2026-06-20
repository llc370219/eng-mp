const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const config = require('../config');
const validate = require('../middlewares/validator');

// 生成 token 对
function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
  const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
}

// 注册
const register = [
  body('email').isEmail().withMessage('请输入有效的邮箱'),
  body('password').isLength({ min: 6 }).withMessage('密码至少 6 位'),
  body('nickname').optional().trim(),
  validate,
  async (req, res, next) => {
    try {
      const { email, password, nickname } = req.body;

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: '该邮箱已注册' });
      }

      const passwordHash = await User.hashPassword(password);
      const user = await User.create({ email, passwordHash, nickname: nickname || '' });
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

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      const valid = await user.comparePassword(password);
      if (!valid) {
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      const tokens = generateTokens(user._id);
      res.json({ user, ...tokens });
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
      if (!user) {
        return res.status(401).json({ error: '用户不存在' });
      }

      const tokens = generateTokens(user._id);
      res.json(tokens);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Refresh token 已过期，请重新登录' });
      }
      return res.status(401).json({ error: '无效的 refresh token' });
    }
  },
];

module.exports = { register, login, refresh };
