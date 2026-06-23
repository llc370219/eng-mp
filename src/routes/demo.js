const { Router } = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Article = require('../models/Article');
const { tryCheckIn, hasCheckedIn, getCheckInHistory, getStreak } = require('../services/checkin');
const Exercise = require('../models/Exercise');
const Vocab = require('../models/Vocab');
const VocabProgress = require('../models/VocabProgress');
const Grammar = require('../models/Grammar');
const ReadingProgress = require('../models/ReadingProgress');
const StudySession = require('../models/StudySession');
const VerificationCode = require('../models/VerificationCode');
const WrongAnswer = require('../models/WrongAnswer');
const { calculateNextReview } = require('../services/spaced-repetition');
const { generateCode, sendVerificationCode } = require('../services/email');
const { generateCaptcha, verifyCaptcha } = require('../utils/captcha');

const router = Router();

function render(res, page, data = {}) {
  res.render(page, { page, user: res.locals.user || null, ...data });
}

// Cookie 认证
router.use(async (req, res, next) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      res.locals.user = await User.findById(payload.userId);
    } catch {}
  }
  next();
});

// ===== 登录 =====
router.get('/login', (req, res) => {
  // 重定向到 Lull 前端设计稿
  res.redirect('/Lull-Reading.dc.html?v=2.9.1');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.render('login', { msg: '邮箱或密码错误', type: 'err', page: 'login', user: null });
    if (user.isLocked()) return res.render('login', { msg: '账户已锁定，请15分钟后再试', type: 'err', page: 'login', user: null });
    if (!(await user.comparePassword(password))) {
      await user.incrementLoginAttempts();
      return res.render('login', { msg: '邮箱或密码错误', type: 'err', page: 'login', user: null });
    }
    await user.resetLoginAttempts();
    user.lastLoginAt = new Date();
    await user.save();
    const token = jwt.sign({ userId: user._id }, config.jwt.secret, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect('/demo/');
  } catch (e) { res.render('login', { msg: '登录失败: ' + e.message, type: 'err', page: 'login', user: null }); }
});

// ===== 注册（验证码） =====
router.get('/register', (req, res) => {
  const invite = req.query.invite || '';
  // 重定向到 Lull 前端设计稿
  res.redirect(`/Lull-Reading.dc.html?v=2.9.1${invite ? '&invite=' + invite : ''}`);
});

// 获取新验证码（AJAX）
router.get('/captcha', (req, res) => {
  const captcha = generateCaptcha();
  res.json({ token: captcha.token, svg: captcha.svg });
});

// 发送验证码
router.post('/send-code', async (req, res) => {
  const { email, captchaToken, captchaAnswer } = req.body;

  // 人机验证
  if (!verifyCaptcha(captchaToken, captchaAnswer)) {
    const captcha = generateCaptcha();
    return res.render('register', { msg: '验证码错误，请重新输入', page: 'register', user: null, email, captchaSvg: captcha.svg, captchaToken: captcha.token });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      const captcha = generateCaptcha();
      return res.render('register', { msg: '该邮箱已注册', page: 'register', user: null, captchaSvg: captcha.svg, captchaToken: captcha.token });
    }

    const recent = await VerificationCode.findOne({
      email, type: 'register', used: false,
      createdAt: { $gte: new Date(Date.now() - 60000) },
    });
    if (recent) {
      const captcha = generateCaptcha();
      return res.render('register', { msg: '验证码已发送，请60秒后再试', page: 'register', user: null, email, captchaSvg: captcha.svg, captchaToken: captcha.token });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await VerificationCode.create({ email, code, type: 'register', expiresAt });
    await sendVerificationCode(email, code, 'register');

    const captcha = generateCaptcha();
    res.render('register', { msg: '验证码已发送到您的邮箱', page: 'register', user: null, email, captchaSvg: captcha.svg, captchaToken: captcha.token, codeSent: true });
  } catch (e) {
    const captcha = generateCaptcha();
    res.render('register', { msg: '发送失败: ' + e.message, page: 'register', user: null, captchaSvg: captcha.svg, captchaToken: captcha.token });
  }
});

// 验证码注册
router.post('/register', async (req, res) => {
  const { email, code, password, nickname, inviteCode } = req.body;

  // 辅助函数：重新渲染注册页（带新验证码）
  const renderWithCaptcha = (msg, extra = {}) => {
    const captcha = generateCaptcha();
    return res.render('register', { msg, page: 'register', user: null, email, captchaSvg: captcha.svg, captchaToken: captcha.token, ...extra });
  };

  try {
    const existing = await User.findOne({ email });
    if (existing) return renderWithCaptcha('该邮箱已注册');

    // 验证邀请码（必须）
    if (!inviteCode) return renderWithCaptcha('请输入邀请码');
    const InviteCode = require('../models/InviteCode');
    const invite = await InviteCode.findOne({ code: inviteCode.toUpperCase(), isActive: true });
    if (!invite) return renderWithCaptcha('邀请码无效');
    if (invite.expiresAt && invite.expiresAt < new Date()) return renderWithCaptcha('邀请码已过期');
    if (invite.usedCount >= invite.maxUses) return renderWithCaptcha('邀请码已用完');
    req._inviteCode = invite;

    const record = await VerificationCode.findOne({
      email, type: 'register', used: false,
    }).sort({ createdAt: -1 });

    if (!record) return renderWithCaptcha('请先获取验证码');
    if (record.expiresAt < new Date()) return renderWithCaptcha('验证码已过期，请重新获取');
    if (record.attempts >= 5) return renderWithCaptcha('验证码尝试次数过多，请重新获取');
    if (record.code !== code) {
      record.attempts += 1;
      await record.save();
      return renderWithCaptcha('验证码错误');
    }

    record.used = true;
    await record.save();

    const passwordHash = await User.hashPassword(password);
    const newUser = await User.create({ email, passwordHash, nickname: nickname || '', emailVerified: true });

    // 更新邀请码
    if (req._inviteCode) {
      req._inviteCode.usedCount += 1;
      req._inviteCode.usedBy.push(newUser._id);
      await req._inviteCode.save();
    }

    res.render('login', { msg: '注册成功，请登录', type: 'ok', page: 'login', user: null });
  } catch (e) { renderWithCaptcha('注册失败: ' + e.message); }
});

router.get('/logout', (req, res) => { res.clearCookie('token'); res.redirect('/demo/login'); });

function requireAuth(req, res, next) {
  if (!res.locals.user) return res.redirect('/demo/login');
  next();
}

// ===== 文章列表 =====
router.get('/', requireAuth, async (req, res) => {
  const { difficulty, category } = req.query;
  const filter = { isPublished: true };
  if (difficulty) filter.difficulty = difficulty;
  if (category) filter.category = category;
  const articles = await Article.find(filter).sort({ createdAt: -1 }).select('-content');
  render(res, 'articles', { articles, difficulty: difficulty || '', category: category || '' });
});

// ===== 文章详情 =====
router.get('/article/:id', requireAuth, async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) return res.redirect('/demo/');
  const exercise = await Exercise.findOne({ articleId: article._id });

  // 记录阅读进度
  await ReadingProgress.findOneAndUpdate(
    { userId: res.locals.user._id, articleId: article._id },
    { $setOnInsert: { startTime: new Date(), status: 'reading', wordCount: article.wordCount } },
    { upsert: true }
  );

  // 获取用户生词本（用于高亮）
  const userVocab = await VocabProgress.find({ userId: res.locals.user._id }).select('word');
  const vocabWords = userVocab.map(v => v.word.toLowerCase());

  // 用户设置
  const userSettings = res.locals.user.preferences || {};
  const sentenceHighlight = userSettings.sentenceHighlight !== false; // 默认开启

  render(res, 'article', { article, exercise, results: null, score: null, aiResult: null, vocabWords, sentenceHighlight });
});

// ===== 提交练习 =====
router.post('/article/:id/submit', requireAuth, async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) return res.redirect('/demo/');
  const exercise = await Exercise.findOne({ articleId: article._id });
  if (!exercise) return res.redirect('/demo/article/' + req.params.id);
  const answers = req.body;
  let correct = 0;
  const results = exercise.questions.map((q, i) => {
    const userAnswer = answers['q' + i] || '';
    const isCorrect = userAnswer === q.answer;
    if (isCorrect) correct++;
    return { question: q.text, options: q.options, userAnswer, correctAnswer: q.answer, isCorrect, explanation: q.explanation };
  });
  const score = exercise.questions.length > 0 ? Math.round((correct / exercise.questions.length) * 100) : 0;

  // 更新阅读进度
  await ReadingProgress.findOneAndUpdate(
    { userId: res.locals.user._id, articleId: article._id },
    { exerciseScore: score, exerciseResults: results, status: 'completed', endTime: new Date(), progress: 100 }
  );

  // 自动打卡
  const checkinResult = await tryCheckIn(res.locals.user._id, { type: 'reading' });
  const checkedIn = checkinResult.qualified;

  render(res, 'article', { article, exercise, results, score, aiResult: null, checkedIn });
});

// ===== 文章内 AI 分析 =====
router.post('/article/:id/ai', requireAuth, async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) return res.redirect('/demo/');
  const exercise = await Exercise.findOne({ articleId: article._id });
  const { task } = req.body;
  const ai = require('../services/ai');
  let aiResult = null;
  try {
    if (task === 'summarize') aiResult = { type: 'summarize', data: await ai.summarize(article.content, 'both') };
    else if (task === 'translate') aiResult = { type: 'translate', data: await ai.translate(article.content.substring(0, 1000), 'zh') };
    else if (task === 'quiz') {
      const r = await ai.generateQuiz(article.content, 3);
      aiResult = { type: 'quiz', data: r };
    }
  } catch (e) { aiResult = { type: 'error', data: { error: e.message } }; }
  render(res, 'article', { article, exercise, results: null, score: null, aiResult });
});

router.get('/dict', requireAuth, async (req, res) => {
  const { word, sentence } = req.query;
  let result = null, sentenceResult = null;
  if (word) {
    const caiyun = require('../services/caiyun');
    const cy = await caiyun.dict(word);
    if (cy) {
      result = {
        word: cy.word,
        phonetic: cy.phonetic || '',
        translation: Array.isArray(cy.explanations) ? cy.explanations.join('\n') : '',
        definitionEn: '',
        examples: (cy.examples || []).map(e => e.en + (e.zh ? ` #${e.zh}` : '')),
        collins: '',
        tag: '',
        exchange: '',
        source: 'caiyun'
      };
    }
  }
  if (sentence) {
    const ai = require('../services/ai');
    try { sentenceResult = await ai.translate(sentence, 'zh'); } catch (e) { sentenceResult = { error: e.message }; }
  }
  render(res, 'dict', { word: word || '', result, sentence: sentence || '', sentenceResult });
});

// ===== 添加生词 =====
router.post('/vocab/add', requireAuth, async (req, res) => {
  const { word, definition, phonetic } = req.body;
  try {
    const existing = await VocabProgress.findOne({ userId: res.locals.user._id, word: word.toLowerCase() });
    if (!existing) {
      await VocabProgress.create({
        userId: res.locals.user._id,
        word: word.toLowerCase(),
        definition: definition || '',
        phonetic: phonetic || '',
        source: 'dict',
      });
    }
  } catch {}
  res.redirect('/demo/vocab');
});

// ===== 生词本 =====
router.get('/vocab', requireAuth, async (req, res) => {
  const vocabs = await VocabProgress.find({ userId: res.locals.user._id }).sort({ createdAt: -1 });
  const totalCount = vocabs.length;
  const masteredCount = vocabs.filter(v => v.masteryLevel === 'mastered').length;
  const reviewCount = vocabs.filter(v => v.nextReview <= new Date()).length;
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dailyAdd = await VocabProgress.aggregate([
    { $match: { userId: res.locals.user._id, createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  render(res, 'vocab', { vocabs, totalCount, masteredCount, reviewCount, dailyAdd });
});

// ===== 复习 =====
router.get('/vocab/review', requireAuth, async (req, res) => {
  const vocabs = await VocabProgress.find({ userId: res.locals.user._id, nextReview: { $lte: new Date() } }).sort({ nextReview: 1 });
  render(res, 'review', { vocabs, msg: vocabs.length ? null : '今天没有需要复习的单词 🎉' });
});

router.post('/vocab/review/:id', requireAuth, async (req, res) => {
  const quality = parseInt(req.body.quality);
  const vocab = await VocabProgress.findOne({ _id: req.params.id, userId: res.locals.user._id });
  if (vocab) {
    const r = calculateNextReview(vocab, quality);
    Object.assign(vocab, r, { lastReview: new Date(), totalReviews: vocab.totalReviews + 1 });
    if (quality >= 3) vocab.correctReviews += 1;
    vocab.lastScore = quality;
    if (vocab.repetition >= 5 && vocab.easeFactor >= 2.3) vocab.masteryLevel = 'mastered';
    else if (vocab.repetition >= 2) vocab.masteryLevel = 'review';
    else if (vocab.repetition >= 1) vocab.masteryLevel = 'learning';
    await vocab.save();

    // 自动打卡（每次复习计1个单词）
    await tryCheckIn(res.locals.user._id, { type: 'vocab', count: 1 });
  }
  res.redirect('/demo/vocab/review');
});

router.post('/vocab/delete/:id', requireAuth, async (req, res) => {
  await VocabProgress.findOneAndDelete({ _id: req.params.id, userId: res.locals.user._id });
  res.redirect('/demo/vocab');
});

// ===== 语法 =====
router.get('/grammar', requireAuth, async (req, res) => {
  const { level, category } = req.query;
  const filter = {};
  if (level) filter.level = level;
  if (category) filter.category = category;
  const grammars = await Grammar.find(filter).sort({ level: 1, category: 1 });
  render(res, 'grammar', { grammars, level: level || '', category: category || '' });
});

router.get('/grammar/:id', requireAuth, async (req, res) => {
  const grammar = await Grammar.findById(req.params.id);
  if (!grammar) return res.redirect('/demo/grammar');
  render(res, 'grammarDetail', { grammar, results: null, score: null });
});

router.post('/grammar/:id/submit', requireAuth, async (req, res) => {
  const grammar = await Grammar.findById(req.params.id);
  if (!grammar) return res.redirect('/demo/grammar');
  const answers = req.body;
  let correct = 0;
  const results = grammar.exercises.map((q, i) => {
    const userAnswer = answers['q' + i] || '';
    const isCorrect = userAnswer === q.answer;
    if (isCorrect) correct++;
    return { ...q.toObject(), userAnswer, correctAnswer: q.answer, isCorrect };
  });
  const score = grammar.exercises.length > 0 ? Math.round((correct / grammar.exercises.length) * 100) : 0;
  render(res, 'grammarDetail', { grammar, results, score });
});

// ===== 打卡 =====
router.get('/checkin', requireAuth, async (req, res) => {
  const userId = res.locals.user._id;
  const todayChecked = await hasCheckedIn(userId);
  const history = await getCheckInHistory(userId, 60);
  const streak = await getStreak(userId);
  const today = new Date().toISOString().slice(0, 10);
  render(res, 'checkin', { todayChecked, history, streak, today });
});

router.post('/checkin', requireAuth, async (req, res) => {
  const userId = res.locals.user._id;
  const { type } = req.body; // 'reading' | 'vocab' | 'study'
  const result = await tryCheckIn(userId, { type, count: 1, minutes: 5 });
  res.redirect('/demo/checkin');
});

// ===== 统计 =====
router.get('/stats', requireAuth, async (req, res) => {
  const userId = res.locals.user._id;

  const [
    vocabTotal, vocabMastered, reviewCount, wrongTotal, wrongUnmastered,
    readingCompleted, readingStats, sessionStats
  ] = await Promise.all([
    VocabProgress.countDocuments({ userId }),
    VocabProgress.countDocuments({ userId, masteryLevel: 'mastered' }),
    VocabProgress.countDocuments({ userId, nextReview: { $lte: new Date() } }),
    WrongAnswer.countDocuments({ userId }),
    WrongAnswer.countDocuments({ userId, mastered: false }),
    ReadingProgress.countDocuments({ userId, status: 'completed' }),
    ReadingProgress.aggregate([
      { $match: { userId, exerciseScore: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$exerciseScore' }, total: { $sum: '$wordCount' } } },
    ]),
    StudySession.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalMin: { $sum: '$durationMin' }, count: { $sum: 1 } } },
    ]),
  ]);

  // 连续学习天数
  const [vocabDates, readingDates, sessionDates] = await Promise.all([
    VocabProgress.aggregate([{ $match: { userId } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } }]),
    ReadingProgress.aggregate([{ $match: { userId } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } }]),
    StudySession.aggregate([{ $match: { userId } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } }]),
  ]);
  const allDates = new Set();
  [...vocabDates, ...readingDates, ...sessionDates].forEach(d => allDates.add(d._id));
  const sortedDates = [...allDates].sort().reverse();
  let streak = 0;
  if (sortedDates.length) {
    const today = new Date(); today.setHours(0,0,0,0);
    let check = new Date(today);
    for (const ds of sortedDates) {
      const d = new Date(ds + 'T00:00:00');
      const diff = Math.round((check - d) / 86400000);
      if (diff === 0 || (streak === 0 && diff === 1)) { streak++; check = new Date(d); check.setDate(check.getDate() - 1); }
      else if (diff > 1) break;
    }
  }

  // 7天趋势
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekTrend = await VocabProgress.aggregate([
    { $match: { userId, createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const grammarTotal = await Grammar.countDocuments({});

  render(res, 'stats', {
    vocabTotal, vocabMastered, reviewCount, wrongTotal, wrongUnmastered,
    streak, weekTrend, grammarTotal,
    readingCompleted, totalWordsRead: readingStats[0]?.total || 0,
    avgScore: readingStats[0]?.avg ? Math.round(readingStats[0].avg) : null,
    totalStudyMin: sessionStats[0]?.totalMin || 0,
    totalSessions: sessionStats[0]?.count || 0,
  });
});

// ===== AI =====
router.get('/ai', requireAuth, async (req, res) => {
  const articles = await Article.find({ isPublished: true }).select('title difficulty').sort({ difficulty: 1 });
  render(res, 'ai', { result: null, task: null, articles, selectedArticle: null });
});

router.post('/ai/summarize', requireAuth, async (req, res) => {
  const { text, articleId } = req.body;
  const articles = await Article.find({ isPublished: true }).select('title difficulty').sort({ difficulty: 1 });
  let content = text;
  let selectedArticle = null;
  if (articleId) { const a = await Article.findById(articleId); if (a) { content = a.content; selectedArticle = a; } }
  const ai = require('../services/ai');
  try {
    const r = await ai.summarize(content, 'both');
    render(res, 'ai', { result: { type: 'summarize', data: r }, task: 'summarize', articles, selectedArticle });
  } catch (e) { render(res, 'ai', { result: { type: 'error', data: { error: e.message } }, task: 'summarize', articles, selectedArticle }); }
});

router.post('/ai/analyze', requireAuth, async (req, res) => {
  const { word } = req.body;
  const articles = await Article.find({ isPublished: true }).select('title difficulty').sort({ difficulty: 1 });
  const ai = require('../services/ai');
  try {
    const r = await ai.analyzeWord(word);
    render(res, 'ai', { result: { type: 'analyze', data: r }, task: 'analyze', articles, selectedArticle: null });
  } catch (e) { render(res, 'ai', { result: { type: 'error', data: { error: e.message } }, task: 'analyze', articles, selectedArticle: null }); }
});

router.post('/ai/quiz', requireAuth, async (req, res) => {
  const { text, articleId } = req.body;
  const articles = await Article.find({ isPublished: true }).select('title difficulty').sort({ difficulty: 1 });
  let content = text;
  let selectedArticle = null;
  if (articleId) { const a = await Article.findById(articleId); if (a) { content = a.content; selectedArticle = a; } }
  const ai = require('../services/ai');
  try {
    const r = await ai.generateQuiz(content, 3);
    render(res, 'ai', { result: { type: 'quiz', data: r }, task: 'quiz', articles, selectedArticle });
  } catch (e) { render(res, 'ai', { result: { type: 'error', data: { error: e.message } }, task: 'quiz', articles, selectedArticle }); }
});

router.post('/ai/history', requireAuth, async (req, res) => {
  const userId = res.locals.user._id;
  const articles = await Article.find({ isPublished: true }).select('title difficulty').sort({ difficulty: 1 });
  const vocabs = await VocabProgress.find({ userId }).sort({ createdAt: -1 }).limit(10);
  const wrongAnswers = await WrongAnswer.find({ userId }).sort({ createdAt: -1 }).limit(10);
  const readProgress = await ReadingProgress.find({ userId }).sort({ updatedAt: -1 }).limit(5).populate('articleId', 'title difficulty');
  const ai = require('../services/ai');
  const summary = `用户学习数据:\n- 生词总数: ${vocabs.length}\n- 最近生词: ${vocabs.map(v=>v.word).join(', ')}\n- 错题数: ${wrongAnswers.length}\n- 最近阅读: ${readProgress.map(p=>p.articleId?.title||'').join(', ')}\n- 阅读完成: ${readProgress.filter(p=>p.status==='completed').length}篇`;
  try {
    const r = await ai.chat('你是一个英语学习顾问。根据用户的学习数据，给出个性化的学习建议和分析。用中文回复。', summary);
    render(res, 'ai', { result: { type: 'history', data: { analysis: r } }, task: 'history', articles, selectedArticle: null });
  } catch (e) { render(res, 'ai', { result: { type: 'error', data: { error: e.message } }, task: 'history', articles, selectedArticle: null }); }
});

// ===== 用户设置 =====
router.get('/settings', requireAuth, async (req, res) => {
  render(res, 'settings', { msg: null });
});

router.post('/settings', requireAuth, async (req, res) => {
  const { sentenceHighlight, dailyGoalMin } = req.body;
  const user = res.locals.user;
  user.preferences = user.preferences || {};
  user.preferences.sentenceHighlight = sentenceHighlight === 'on';
  user.preferences.dailyGoalMin = parseInt(dailyGoalMin) || 30;
  await user.save();
  render(res, 'settings', { msg: '设置已保存' });
});

module.exports = router;
