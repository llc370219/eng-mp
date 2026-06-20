const logger = require('../utils/logger');

// 统一错误处理中间件
function errorHandler(err, req, res, _next) {
  const requestId = req.requestId || '-';

  // 记录错误日志
  logger.error(`[${requestId}] ${req.method} ${req.path}:`, err.message);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    logger.debug(err.stack);
  }

  // 判断是否为 Demo 页面请求
  const isDemoPage = req.path.startsWith('/demo');

  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    const msg = '参数验证失败: ' + messages.join(', ');
    return isDemoPage
      ? res.status(400).send(errorPage(msg, requestId))
      : res.status(400).json({ error: '参数验证失败', details: messages, requestId });
  }

  // Mongoose 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const msg = `${field} 已存在`;
    return isDemoPage
      ? res.status(409).send(errorPage(msg, requestId))
      : res.status(409).json({ error: msg, requestId });
  }

  // Mongoose CastError（无效 ObjectId）
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    const msg = '无效的 ID 格式';
    return isDemoPage
      ? res.status(400).send(errorPage(msg, requestId))
      : res.status(400).json({ error: msg, requestId });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    const msg = '无效的认证令牌';
    return isDemoPage
      ? res.redirect('/demo/login')
      : res.status(401).json({ error: msg, requestId });
  }

  if (err.name === 'TokenExpiredError') {
    const msg = '令牌已过期';
    return isDemoPage
      ? res.redirect('/demo/login')
      : res.status(401).json({ error: msg, requestId });
  }

  // 自定义业务错误
  if (err.statusCode) {
    return isDemoPage
      ? res.status(err.statusCode).send(errorPage(err.message, requestId))
      : res.status(err.statusCode).json({ error: err.message, requestId });
  }

  // 默认 500（生产环境不暴露内部错误）
  const message = process.env.NODE_ENV === 'production'
    ? '服务器内部错误'
    : err.message || '服务器内部错误';

  if (isDemoPage) {
    res.status(500).send(errorPage(message, requestId));
  } else {
    res.status(500).json({ error: message, requestId });
  }
}

function errorPage(message, requestId) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>错误</title>
<style>body{font-family:-apple-system,sans-serif;max-width:500px;margin:80px auto;padding:20px;text-align:center}
h1{font-size:48px;margin-bottom:8px}p{color:#6B7280;font-size:14px}.btn{display:inline-block;margin-top:20px;padding:10px 20px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px}</style>
</head><body><h1>😵</h1><h2>出错了</h2><p>${message}</p><p style="font-size:11px;color:#9CA3AF">Request ID: ${requestId}</p><a href="/demo/" class="btn">返回首页</a></body></html>`;
}

module.exports = errorHandler;
