const { Router } = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Article = require('../models/Article');
const Exercise = require('../models/Exercise');
const Vocab = require('../models/Vocab');
const Dictionary = require('../models/Dictionary');
const Grammar = require('../models/Grammar');
const ReadingLog = require('../models/ReadingLog');
const WrongAnswer = require('../models/WrongAnswer');
const { calculateNextReview } = require('../services/spaced-repetition');

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
router.get('/login', (req, res) => res.render('login', { msg: req.query.msg, type: req.query.type || 'ok', page: 'login', user: null }));

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.render('login', { msg: '邮箱或密码错误', type: 'err', page: 'login', user: null });
    const token = jwt.sign({ userId: user._id }, config.jwt.secret, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect('/demo/');
  } catch (e) { res.render('login', { msg: '登录失败: ' + e.message, type: 'err', page: 'login', user: null }); }
});

router.get('/register', (req, res) => res.render('register', { msg: null, page: 'register', user: null }));

router.post('/register', async (req, res) => {
  const { email, password, nickname } = req.body;
  try {
    const passwordHash = await User.hashPassword(password);
    await User.create({ email, passwordHash, nickname: nickname || '' });
    res.render('login', { msg: '注册成功，请登录', type: 'ok', page: 'login', user: null });
  } catch (e) { res.render('register', { msg: '注册失败: ' + e.message, page: 'register', user: null }); }
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
  render(res, 'article', { article, exercise, results: null, score: null, aiResult: null });
});

// ===== 提交练习 =====
router.post('/article/:id/submit', requireAuth, async (req, res) => {
  const article = await Article.findById(req.params.id);
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
  const score = Math.round((correct / exercise.questions.length) * 100);
  render(res, 'article', { article, exercise, results, score, aiResult: null });
});

// ===== 文章内 AI 分析 =====
router.post('/article/:id/ai', requireAuth, async (req, res) => {
  const article = await Article.findById(req.params.id);
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

// ===== 词典 =====
router.get('/dict', requireAuth, async (req, res) => {
  const { word, sentence } = req.query;
  let result = null, sentenceResult = null;
  if (word) {
    result = await Dictionary.findOne({ word: word.toLowerCase() });
    if (!result) {
      try {
        const r = await fetch(`${config.dictApiUrl}/${encodeURIComponent(word)}`);
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data) && data.length) {
            const entry = data[0];
            const defs = [], exs = [];
            for (const m of entry.meanings || []) for (const d of m.definitions || []) { defs.push(`(${m.partOfSpeech}) ${d.definition}`); if (d.example) exs.push(d.example); }
            result = { word: entry.word, phonetic: entry.phonetics?.find(p => p.text)?.text || '', translation: '', definitionEn: defs.slice(0, 5).join('\n'), examples: exs.slice(0, 3), source: 'external' };
          }
        }
      } catch {}
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
    const existing = await Vocab.findOne({ userId: res.locals.user._id, word: word.toLowerCase() });
    if (!existing) await Vocab.create({ userId: res.locals.user._id, word: word.toLowerCase(), definition: definition || '', phonetic: phonetic || '' });
  } catch {}
  res.redirect('/demo/vocab');
});

// ===== 生词本 =====
router.get('/vocab', requireAuth, async (req, res) => {
  const vocabs = await Vocab.find({ userId: res.locals.user._id }).sort({ createdAt: -1 });
  // 统计数据
  const totalCount = vocabs.length;
  const masteredCount = vocabs.filter(v => v.repetition >= 3).length;
  const reviewCount = vocabs.filter(v => v.nextReview <= new Date()).length;
  // 最近30天添加趋势
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dailyAdd = await Vocab.aggregate([
    { $match: { userId: res.locals.user._id, createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  render(res, 'vocab', { vocabs, totalCount, masteredCount, reviewCount, dailyAdd });
});

// ===== 复习 =====
router.get('/vocab/review', requireAuth, async (req, res) => {
  const vocabs = await Vocab.find({ userId: res.locals.user._id, nextReview: { $lte: new Date() } }).sort({ nextReview: 1 });
  render(res, 'review', { vocabs, msg: vocabs.length ? null : '今天没有需要复习的单词 🎉' });
});

router.post('/vocab/review/:id', requireAuth, async (req, res) => {
  const quality = parseInt(req.body.quality);
  const vocab = await Vocab.findOne({ _id: req.params.id, userId: res.locals.user._id });
  if (vocab) { const r = calculateNextReview(vocab, quality); Object.assign(vocab, r, { lastReview: new Date() }); await vocab.save(); }
  res.redirect('/demo/vocab/review');
});

router.post('/vocab/delete/:id', requireAuth, async (req, res) => {
  await Vocab.findOneAndDelete({ _id: req.params.id, userId: res.locals.user._id });
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
    return { ...q.toObject(), userAnswer, isCorrect };
  });
  const score = Math.round((correct / grammar.exercises.length) * 100);
  render(res, 'grammarDetail', { grammar, results, score });
});

// ===== 统计 =====
router.get('/stats', requireAuth, async (req, res) => {
  const userId = res.locals.user._id;
  const [vocabTotal, vocabMastered, reviewCount, wrongTotal, wrongUnmastered] = await Promise.all([
    Vocab.countDocuments({ userId }),
    Vocab.countDocuments({ userId, repetition: { $gte: 3 } }),
    Vocab.countDocuments({ userId, nextReview: { $lte: new Date() } }),
    WrongAnswer.countDocuments({ userId }),
    WrongAnswer.countDocuments({ userId, mastered: false }),
  ]);
  // 连续学习天数
  const vocabDates = await Vocab.aggregate([
    { $match: { userId } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } },
    { $sort: { _id: -1 } }
  ]);
  let streak = 0;
  if (vocabDates.length) {
    const today = new Date(); today.setHours(0,0,0,0);
    let check = new Date(today);
    for (const d of vocabDates) {
      const dd = new Date(d._id + 'T00:00:00');
      const diff = Math.round((check - dd) / 86400000);
      if (diff === 0 || (streak === 0 && diff === 1)) { streak++; check = new Date(dd); check.setDate(check.getDate() - 1); }
      else if (diff > 1) break;
    }
  }
  // 最近7天添加趋势
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekTrend = await Vocab.aggregate([
    { $match: { userId, createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  // 语法统计
  const grammarTotal = await Grammar.countDocuments({});
  render(res, 'stats', { vocabTotal, vocabMastered, reviewCount, wrongTotal, wrongUnmastered, streak, weekTrend, grammarTotal });
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
  const vocabs = await Vocab.find({ userId }).sort({ createdAt: -1 }).limit(10);
  const wrongAnswers = await WrongAnswer.find({ userId }).sort({ createdAt: -1 }).limit(10);
  const ai = require('../services/ai');
  const summary = `用户学习数据:\n- 生词总数: ${vocabs.length}\n- 最近生词: ${vocabs.map(v=>v.word).join(', ')}\n- 错题数: ${wrongAnswers.length}\n- 最近错题: ${wrongAnswers.map(w=>w.questionText).join('; ')}`;
  try {
    const r = await ai.chat('你是一个英语学习顾问。根据用户的学习数据，给出个性化的学习建议和分析。用中文回复。', summary);
    render(res, 'ai', { result: { type: 'history', data: { analysis: r } }, task: 'history', articles, selectedArticle: null });
  } catch (e) { render(res, 'ai', { result: { type: 'error', data: { error: e.message } }, task: 'history', articles, selectedArticle: null }); }
});

module.exports = router;
