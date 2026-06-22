const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const config = require('./config');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const rateLimiter = require('./middlewares/rateLimiter');
const sanitize = require('./middlewares/sanitize');
const logger = require('./utils/logger');

// 路由
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const personalArticleRoutes = require('./routes/personalArticles');
const vocabRoutes = require('./routes/vocab');
const userRoutes = require('./routes/user');
const exerciseRoutes = require('./routes/exercises');
const dictRoutes = null; // Removed
const grammarRoutes = require('./routes/grammar');
const aiRoutes = require('./routes/ai');
const studyRoutes = require('./routes/study');
const adminRoutes = require('./routes/admin');
const docsRoutes = require('./routes/docs');
const demoRoutes = require('./routes/demo');
const frontendDataRoutes = require('./routes/frontendData');

const app = express();

// ===== 模板引擎 =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// ===== 安全中间件 =====
app.use(helmet({
  contentSecurityPolicy: false,  // 允许内联样式
}));
app.use(cors({
  origin: config.nodeEnv === 'production'
    ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ===== 基础中间件 =====
app.use(compression());
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(cookieParser());
app.use(sanitize);

if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.use(rateLimiter({ windowMs: 60 * 1000, max: 100 }));

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || generateRequestId();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// 首页跳转新前端（放在静态文件之前，避免 public/index.html 抢先）
app.get('/', (req, res) => res.redirect('/Lull-Reading.dc.html'));

// ===== 静态文件 =====
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static(path.join(__dirname, '../public')));

// ===== 健康检查 =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), uptime: Math.floor(process.uptime()), env: config.nodeEnv });
});

// ===== API 路由 =====
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/personal-articles', personalArticleRoutes);
app.use('/api/vocab', vocabRoutes);
app.use('/api/user', userRoutes);
app.use('/api', exerciseRoutes);
app.use('/api/grammar', grammarRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/frontend', frontendDataRoutes);

// ===== 服务端渲染 Demo =====
app.use('/demo', demoRoutes);

// ===== 后台管理 =====
app.use('/admin', adminRoutes);

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在', path: req.path });
});

// ===== 错误处理 =====
app.use(errorHandler);

// ===== 启动 =====
async function start() {
  await connectDB();
  // 初始化系统设置
  const SystemSetting = require('./models/SystemSetting');
  await SystemSetting.initDefaults();
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = app;
