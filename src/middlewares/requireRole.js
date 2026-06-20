function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return req.path.startsWith('/admin')
        ? res.redirect('/admin/login')
        : res.status(401).json({ error: '未登录' });
    }
    if (!roles.includes(req.user.role)) {
      return req.path.startsWith('/admin')
        ? res.status(403).send(errorPage('权限不足，需要 ' + roles.join('/') + ' 角色'))
        : res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

function errorPage(message) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>错误</title>
<style>body{font-family:-apple-system,sans-serif;max-width:500px;margin:80px auto;padding:20px;text-align:center}
h1{font-size:48px}p{color:#6B7280}.btn{display:inline-block;margin-top:20px;padding:10px 20px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px}</style>
</head><body><h1>🚫</h1><h2>权限不足</h2><p>${message}</p><a href="/admin/" class="btn">返回</a></body></html>`;
}

module.exports = requireRole;
