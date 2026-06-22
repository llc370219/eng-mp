const express = require('express');
const { Router } = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const ai = require('../services/ai');
const User = require('../models/User');
const Article = require('../models/Article');
const Exercise = require('../models/Exercise');
const Grammar = require('../models/Grammar');
const Dictionary = null; // Removed
const InviteCode = require('../models/InviteCode');
const CheckIn = require('../models/CheckIn');
const AILog = require('../models/AILog');
const SystemSetting = require('../models/SystemSetting');
const ReadingProgress = require('../models/ReadingProgress');
const VocabProgress = require('../models/VocabProgress');
const StudySession = require('../models/StudySession');
const WrongAnswer = require('../models/WrongAnswer');
const LoginLog = require('../models/LoginLog');
const requireRole = require('../middlewares/requireRole');

const router = Router();

// 管理员认证中间件
router.use(async (req, res, next) => {
  const token = req.cookies?.admin_token || req.cookies?.token;
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      res.locals.user = await User.findById(payload.userId);
    } catch {}
  }
  next();
});

function render(res, page, data = {}) {
  res.render('admin/' + page, { page, user: res.locals.user || null, ...data });
}

// ===== 管理员登录 =====
router.get('/login', (req, res) => render(res, 'login', { msg: null }));

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return render(res, 'login', { msg: '邮箱或密码错误' });
    }
    if (user.role !== 'admin' && user.role !== 'editor') {
      return render(res, 'login', { msg: '权限不足，需要管理员或编辑角色' });
    }
    const token = jwt.sign({ userId: user._id }, config.jwt.secret, { expiresIn: '7d' });
    res.cookie('admin_token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect('/admin/');
  } catch (e) { render(res, 'login', { msg: '登录失败: ' + e.message }); }
});

router.get('/logout', (req, res) => { res.clearCookie('admin_token'); res.redirect('/admin/login'); });

// 需要登录
function adminAuth(req, res, next) {
  if (!res.locals.user || (res.locals.user.role !== 'admin' && res.locals.user.role !== 'editor')) {
    return res.redirect('/admin/login');
  }
  next();
}

// ===== Dashboard =====
router.get('/', adminAuth, async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalUsers, todayUsers, totalArticles, totalGrammar,
    todayActive, todayReads, todayExercises, todayAI
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: today } }),
    Article.countDocuments({ isPublished: true }),
    Grammar.countDocuments(),
    StudySession.distinct('userId', { createdAt: { $gte: today } }).then(ids => ids.length),
    ReadingProgress.countDocuments({ createdAt: { $gte: today } }),
    ReadingProgress.countDocuments({ exerciseScore: { $ne: null }, updatedAt: { $gte: today } }),
    AILog.countDocuments({ createdAt: { $gte: today } }),
  ]);
  const totalDict = 0; // Removed local dict db

  // 用户等级分布
  const levelDist = await User.aggregate([
    { $group: { _id: '$level', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  // 近7天注册趋势
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const registerTrend = await User.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  render(res, 'dashboard', {
    totalUsers, todayUsers, totalArticles, totalGrammar, totalDict,
    todayActive, todayReads, todayExercises, todayAI,
    levelDist, registerTrend
  });
});

// ===== 用户管理 =====
router.get('/users', adminAuth, async (req, res) => {
  const { page = 1, limit = 20, search, level, role } = req.query;
  const filter = {};
  if (search) filter.$or = [{ email: { $regex: search } }, { nickname: { $regex: search } }];
  if (level) filter.level = level;
  if (role) filter.role = role;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  render(res, 'users', { users, total, page: Number(page), limit: Number(limit), search: search || '', level: level || '', role: role || '' });
});

router.get('/users/:id', adminAuth, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.redirect('/admin/users');

  const [readings, vocabs, sessions, wrongAnswers, checkIns, loginLogs] = await Promise.all([
    ReadingProgress.find({ userId: user._id }).sort({ updatedAt: -1 }).limit(10).populate('articleId', 'title difficulty'),
    VocabProgress.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10),
    StudySession.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5),
    WrongAnswer.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10),
    CheckIn.find({ userId: user._id }).sort({ date: -1 }).limit(30),
    LoginLog.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10),
  ]);

  const vocabTotal = await VocabProgress.countDocuments({ userId: user._id });
  const vocabMastered = await VocabProgress.countDocuments({ userId: user._id, masteryLevel: 'mastered' });
  const readCompleted = await ReadingProgress.countDocuments({ userId: user._id, status: 'completed' });
  const totalStudyMin = await StudySession.aggregate([
    { $match: { userId: user._id } },
    { $group: { _id: null, total: { $sum: '$durationMin' } } }
  ]);

  render(res, 'userDetail', {
    user, readings, vocabs, sessions, wrongAnswers, checkIns, loginLogs,
    vocabTotal, vocabMastered, readCompleted, totalStudyMin: totalStudyMin[0]?.total || 0
  });
});

router.post('/users/:id/role', adminAuth, async (req, res) => {
  const { role, aiLimit } = req.body;
  const updateData = { role };
  if (aiLimit !== undefined) {
    updateData.aiLimit = Number(aiLimit) || 0;
  }
  await User.findByIdAndUpdate(req.params.id, updateData);
  res.redirect('/admin/users/' + req.params.id);
});

// ===== 邀请码管理 =====
router.get('/invite', adminAuth, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [codes, total] = await Promise.all([
    InviteCode.find().sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)).populate('createdBy', 'email').populate('usedBy', 'email'),
    InviteCode.countDocuments(),
  ]);
  render(res, 'invite', { codes, total, page: Number(page), limit: Number(limit) });
});

router.post('/invite/create', adminAuth, async (req, res) => {
  const { count = 1, maxUses = 1, note = '' } = req.body;
  const codes = [];
  for (let i = 0; i < Math.min(count, 50); i++) {
    let code;
    do { code = InviteCode.generateCode(); } while (await InviteCode.findOne({ code }));
    codes.push({ code, createdBy: res.locals.user._id, maxUses, note });
  }
  await InviteCode.insertMany(codes);
  res.redirect('/admin/invite');
});

router.post('/invite/:id/toggle', adminAuth, async (req, res) => {
  const code = await InviteCode.findById(req.params.id);
  if (code) { code.isActive = !code.isActive; await code.save(); }
  res.redirect('/admin/invite');
});

router.post('/invite/:id/delete', adminAuth, async (req, res) => {
  await InviteCode.findByIdAndDelete(req.params.id);
  res.redirect('/admin/invite');
});

// ===== 文章管理 =====
router.get('/articles', adminAuth, async (req, res) => {
  const { page = 1, limit = 20, difficulty } = req.query;
  const filter = {};
  if (difficulty) filter.difficulty = difficulty;
  const [articles, total] = await Promise.all([
    Article.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)),
    Article.countDocuments(filter),
  ]);
  render(res, 'articles', { articles, total, page: Number(page), limit: Number(limit), difficulty: difficulty || '', importMsg: req.query.msg || '' });
});

// ===== 文章导入（上传 skill 生成的 zip / json，自动建文章+习题并发布推送） =====
const VALID_DIFF = ['初中', '高中', 'CET4', 'CET6', '考研', '雅思'];
const VALID_CAT = ['tech', 'life', 'news', 'literature', 'science', 'business'];
function normDiff(d) {
  if (d === 'CET-4') return 'CET4';
  if (d === 'CET-6') return 'CET6';
  return VALID_DIFF.includes(d) ? d : '高中';
}
async function createArticleFromObj(obj, publish) {
  const content = obj.content || '';
  const wordCount = obj.wordCount || content.split(/\s+/).filter(w => /[a-zA-Z]/.test(w)).length;
  const art = await Article.create({
    title: obj.title || 'Untitled',
    content,
    summaryZh: obj.summaryZh || '',
    summaryEn: obj.summaryEn || '',
    difficulty: normDiff(obj.difficulty),
    category: VALID_CAT.includes(obj.category) ? obj.category : 'life',
    tags: obj.tags || [],
    wordCount,
    readingTimeMin: obj.readingTimeMin || Math.max(1, Math.ceil(wordCount / 200)),
    highlightedVocab: obj.highlightedVocab || [],
    sentenceTranslations: obj.sentenceTranslations || [],
    grammarPoints: obj.grammarPoints || [],
    source: obj.source || 'import',
    isPublished: publish,
  });
  if (Array.isArray(obj.questions) && obj.questions.length) {
    await Exercise.create({ articleId: art._id, questions: obj.questions });
  }
  return art;
}

// 前端用 fetch 把文件以原始字节 POST 上来；这里用内置 express.raw 读成 Buffer（零依赖、稳定）
router.post('/articles/import', adminAuth, express.raw({ type: '*/*', limit: '30mb' }), async (req, res) => {
  const { unzip } = require('../utils/unzip');
  try {
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || !buf.length) return res.status(400).json({ error: '未收到文件内容' });
    const name = (req.query.name || '').toLowerCase();

    let articles;
    if (name.endsWith('.zip') || buf.readUInt32LE(0) === 0x04034b50) {   // zip 魔数 PK\x03\x04
      const entries = unzip(buf);
      const key = Object.keys(entries).find(k => k.toLowerCase().endsWith('articles.json'))
        || Object.keys(entries).find(k => k.toLowerCase().endsWith('.json'));
      if (!key) throw new Error('压缩包内未找到 .json 文件');
      articles = JSON.parse(entries[key].toString('utf8'));
    } else {
      articles = JSON.parse(buf.toString('utf8'));
    }
    if (!Array.isArray(articles)) articles = [articles];

    // 两步走：默认导入为「草稿（未发布）」，需在列表里人工点「发布」确认后才推送
    const publish = req.query.publish === 'true';
    let ok = 0, skipped = 0;
    for (const obj of articles) {
      if (obj && obj.title && obj.content) { await createArticleFromObj(obj, publish); ok++; }
      else skipped++;
    }
    const tail = publish ? '（已直接发布）' : '（已存为草稿，请在下方逐篇确认后点「发布」推送）';
    res.json({ message: `✅ 成功导入 ${ok} 篇${tail}${skipped ? `，跳过 ${skipped} 条无效` : ''}`, imported: ok, published: publish });
  } catch (err) {
    res.status(400).json({ error: '❌ 导入失败: ' + err.message });
  }
});

router.post('/articles/:id/toggle', adminAuth, async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (article) { article.isPublished = !article.isPublished; await article.save(); }
  res.redirect('/admin/articles');
});

router.post('/articles/:id/delete', adminAuth, async (req, res) => {
  await Article.findByIdAndDelete(req.params.id);
  await Exercise.deleteMany({ articleId: req.params.id });
  res.redirect('/admin/articles');
});

// ===== 语法管理 =====
router.get('/grammar', adminAuth, async (req, res) => {
  const grammars = await Grammar.find().sort({ level: 1, category: 1 });
  render(res, 'grammar', { grammars });
});

router.post('/grammar/:id/delete', adminAuth, async (req, res) => {
  await Grammar.findByIdAndDelete(req.params.id);
  res.redirect('/admin/grammar');
});

// ===== 词典管理 (已弃用，跳转回控制台) =====
router.get('/dict', adminAuth, (req, res) => {
  res.redirect('/admin');
});

// ===== 打卡记录 =====
router.get('/checkin', adminAuth, async (req, res) => {
  const { page = 1, limit = 50, date } = req.query;
  const filter = {};
  if (date) filter.date = date;
  const [checkIns, total] = await Promise.all([
    CheckIn.find(filter).sort({ date: -1, createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)).populate('userId', 'email nickname'),
    CheckIn.countDocuments(filter),
  ]);

  // 今日打卡统计
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toISOString().slice(0, 10);
  const todayCount = await CheckIn.countDocuments({ date: todayStr });

  render(res, 'checkin', { checkIns, total, page: Number(page), limit: Number(limit), date: date || '', todayCount });
});

// ===== AI 管理 =====
router.get('/ai', adminAuth, async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);

  const [totalCalls, todayCalls, providerStats, functionStats] = await Promise.all([
    AILog.countDocuments(),
    AILog.countDocuments({ createdAt: { $gte: today } }),
    AILog.aggregate([
      { $group: { _id: '$provider', count: { $sum: 1 }, tokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } } } },
      { $sort: { count: -1 } }
    ]),
    AILog.aggregate([
      { $group: { _id: '$function', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
  ]);

  const recentLogs = await AILog.find().sort({ createdAt: -1 }).limit(20).populate('userId', 'email');

  render(res, 'ai', { totalCalls, todayCalls, providerStats, functionStats, recentLogs });
});

// ===== 系统设置 =====
router.get('/settings', adminAuth, async (req, res) => {
  const settings = await SystemSetting.getAll();
  render(res, 'settings', { settings });
});

router.post('/settings', adminAuth, async (req, res) => {
  const updates = req.body;
  for (const [key, value] of Object.entries(updates)) {
    // API key 字段：留空表示不修改（避免误清空已有 key）
    if (key.startsWith('aiApiKey_') && value === '') continue;
    let parsed = value;
    if (value === 'true') parsed = true;
    else if (value === 'false') parsed = false;
    else if (!isNaN(value) && value !== '') parsed = Number(value);
    await SystemSetting.set(key, parsed);
  }
  res.redirect('/admin/settings');
});

// 测试 AI 连接
router.post('/settings/test-ai', adminAuth, async (req, res) => {
  try {
    const { provider } = req.body;
    if (!provider) return res.json({ ok: false, message: '请指定提供商' });
    const result = await ai.chat('请用一句话回复"连接成功"', '测试', { provider, maxTokens: 50 });
    res.json({ ok: true, message: result.slice(0, 200) });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

// ===== 统计报表 =====
router.get('/stats', adminAuth, async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalStudyMin, avgStudyMin,
    totalReads, totalWordsRead,
    totalVocab, totalExercises,
    weeklyActive, monthlyActive,
    topArticles, topWords
  ] = await Promise.all([
    StudySession.aggregate([{ $group: { _id: null, total: { $sum: '$durationMin' } } }]),
    StudySession.aggregate([{ $group: { _id: '$userId', total: { $sum: '$durationMin' } } }, { $group: { _id: null, avg: { $avg: '$total' } } }]),
    ReadingProgress.countDocuments({ status: 'completed' }),
    ReadingProgress.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$wordCount' } } }]),
    VocabProgress.countDocuments(),
    WrongAnswer.countDocuments(),
    StudySession.distinct('userId', { createdAt: { $gte: weekStart } }).then(ids => ids.length),
    StudySession.distinct('userId', { createdAt: { $gte: monthStart } }).then(ids => ids.length),
    ReadingProgress.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$articleId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 },
      { $lookup: { from: 'articles', localField: '_id', foreignField: '_id', as: 'article' } },
    ]),
    VocabProgress.aggregate([
      { $group: { _id: '$word', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 },
    ]),
  ]);

  render(res, 'stats', {
    totalStudyMin: totalStudyMin[0]?.total || 0,
    avgStudyMin: Math.round(avgStudyMin[0]?.avg || 0),
    totalReads, totalWordsRead: totalWordsRead[0]?.total || 0,
    totalVocab, totalExercises, weeklyActive, monthlyActive,
    topArticles, topWords
  });
});

module.exports = router;
