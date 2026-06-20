const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

// 可选认证：有 token 就解析，没有也放行
async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next();
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(payload.userId);
    if (user) {
      req.user = user;
    }
  } catch {
    // token 无效也继续，不影响游客访问
  }
  next();
}

module.exports = optionalAuth;
