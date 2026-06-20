const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./config');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const rateLimiter = require('./middlewares/rateLimiter');
const sanitize = require('./middlewares/sanitize');
const logger = require('./utils/logger');

// 路由
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const vocabRoutes = require('./routes/vocab');
const userRoutes = require('./routes/user');
const exerciseRoutes = require('./routes/exercises');
const dictRoutes = require('./routes/dictionary');
const grammarRoutes = require('./routes/grammar');
const aiRoutes = require('./routes/ai');
const docsRoutes = require('./routes/docs');

const app = express();

// ===== 安全中间件 =====
app.use(helmet());                     // 安全 HTTP 头
app.use(cors({
  origin: config.nodeEnv === 'production'
    ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
    : '*',                             // 开发环境允许所有
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,                       // preflight 缓存 24h
}));

// ===== 基础中间件 =====
app.use(compression());                // gzip 响应
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(sanitize);                     // 输入净化（防 NoSQL 注入）

// 请求日志
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// 全局速率限制
app.use(rateLimiter({ windowMs: 60 * 1000, max: 100 }));

// 请求 ID（便于追踪）
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || generateRequestId();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// ===== 健康检查 =====
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    env: config.nodeEnv,
  });
});

// ===== 挂载路由 =====
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/vocab', vocabRoutes);
app.use('/api/user', userRoutes);
app.use('/api', exerciseRoutes);
app.use('/api/dict', dictRoutes);
app.use('/api/grammar', grammarRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/docs', docsRoutes);

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在', path: req.path });
});

// ===== 错误处理 =====
app.use(errorHandler);

// ===== 启动 =====
async function start() {
  await connectDB();
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });
}

// 只在直接运行时启动（测试时不会自动启动）
if (require.main === module) {
  start().catch((err) => {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

// 生成请求 ID
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = app;
