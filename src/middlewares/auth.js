const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

// 必须认证
async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, config.jwt.secret);

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已过期' });
    }
    return res.status(401).json({ error: '无效的认证令牌' });
  }
}

module.exports = auth;
