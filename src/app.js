const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const rateLimiter = require('./middlewares/rateLimiter');

// 路由
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const vocabRoutes = require('./routes/vocab');
const userRoutes = require('./routes/user');
const exerciseRoutes = require('./routes/exercises');
const dictRoutes = require('./routes/dictionary');
const grammarRoutes = require('./routes/grammar');
const aiRoutes = require('./routes/ai');

const app = express();

// 基础中间件
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(rateLimiter({ windowMs: 60 * 1000, max: 100 }));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 挂载路由
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/vocab', vocabRoutes);
app.use('/api/user', userRoutes);
app.use('/api', exerciseRoutes);
app.use('/api/dict', dictRoutes);
app.use('/api/grammar', grammarRoutes);
app.use('/api/ai', aiRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理
app.use(errorHandler);

// 启动
async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

module.exports = app;
