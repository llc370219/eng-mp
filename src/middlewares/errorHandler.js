// 统一错误处理中间件
function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);

  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: '参数验证失败', details: messages });
  }

  // Mongoose 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ error: `${field} 已存在` });
  }

  // Mongoose CastError（无效 ObjectId）
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ error: '无效的 ID 格式' });
  }

  // 自定义业务错误
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // 默认 500
  res.status(500).json({ error: '服务器内部错误' });
}

module.exports = errorHandler;
