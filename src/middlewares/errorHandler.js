const logger = require('../utils/logger');

// 统一错误处理中间件
function errorHandler(err, req, res, _next) {
  const requestId = req.requestId || '-';

  // 记录错误日志
  logger.error(`[${requestId}] ${req.method} ${req.path}:`, err.message);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    logger.debug(err.stack);
  }

  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: '参数验证失败',
      details: messages,
      requestId,
    });
  }

  // Mongoose 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ error: `${field} 已存在`, requestId });
  }

  // Mongoose CastError（无效 ObjectId）
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ error: '无效的 ID 格式', requestId });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: '无效的认证令牌', requestId });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: '令牌已过期', requestId });
  }

  // 自定义业务错误
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message, requestId });
  }

  // 默认 500（生产环境不暴露内部错误）
  const message = process.env.NODE_ENV === 'production'
    ? '服务器内部错误'
    : err.message || '服务器内部错误';

  res.status(500).json({ error: message, requestId });
}

module.exports = errorHandler;
