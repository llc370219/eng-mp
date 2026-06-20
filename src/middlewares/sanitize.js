// 输入净化中间件
// 防止 NoSQL 注入：清理 req.body/req.query/req.params 中的 MongoDB 操作符

function sanitize(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    sanitizeObject(req.params);
  }
  next();
}

function sanitizeObject(obj) {
  for (const key of Object.keys(obj)) {
    // 移除以 $ 开头的键（MongoDB 操作符）
    if (key.startsWith('$')) {
      delete obj[key];
      continue;
    }
    // 递归处理嵌套对象
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      sanitizeObject(obj[key]);
    }
  }
}

module.exports = sanitize;
