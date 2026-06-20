const { Router } = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Article = require('../models/Article');
const Exercise = require('../models/Exercise');
const Vocab = require('../models/Vocab');
const Dictionary = require('../models/Dictionary');
const Grammar = require('../models/Grammar');
const { calculateNextReview } = require('../services/spaced-repetition');

const router = Router();

// 模板渲染辅助
function render(res, page, data = {}) {
  res.render(page, { page, user: res.locals.user || null, ...data });
}

// Cookie 认证中间件
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
  const msg = req.query.msg;
  const type = req.query.type || 'ok';
  res.render('login', { msg, type });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.render('login', { msg: '邮箱或密码错误', type: 'err' });
    }
    const token = jwt.sign({ userId: user._id }, config.jwt.secret, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect('/demo/');
  } catch (e) {
    res.render('login', { msg: '登录失败: ' + e.message, type: 'err' });
  }
});

router.get('/register', (req, res) => {
  res.render('register', { msg: null });
});

router.post('/register', async (req, res) => {
  const { email, password, nickname } = req.body;
  try {
    const passwordHash = await User.hashPassword(password);
    await User.create({ email, passwordHash, nickname: nickname || '' });
    res.render('login', { msg: '注册成功，请登录', type: 'ok' });
  } catch (e) {
    res.render('register', { msg: '注册失败: ' + e.message });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/demo/login');
});

// 需要认证的中间件
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
  render(res, 'articles', { articles, difficulty, category });
});

// ===== 文章详情 =====
router.get('/article/:id', requireAuth, async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) return res.redirect('/demo/');
  const exercise = await Exercise.findOne({ articleId: article._id });
  render(res, 'article', { article, exercise });
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
  render(res, 'article', { article, exercise, results, score });
});

// ===== 词典 =====
router.get('/dict', requireAuth, async (req, res) => {
  const { word } = req.query;
  let result = null;
  if (word) {
    result = await Dictionary.findOne({ word: word.toLowerCase() });
    if (!result) {
      try {
        const url = `${config.dictApiUrl}/${encodeURIComponent(word)}`;
        const r = await fetch(url);
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data) && data.length) {
            const entry = data[0];
            const defs = [];
            const exs = [];
            for (const m of entry.meanings || []) {
              for (const d of m.definitions || []) {
                defs.push(`(${m.partOfSpeech}) ${d.definition}`);
                if (d.example) exs.push(d.example);
              }
            }
            result = { word: entry.word, phonetic: entry.phonetics?.find(p => p.text)?.text || '', translation: '', definitionEn: defs.slice(0, 5).join('\n'), examples: exs.slice(0, 3), source: 'external' };
          }
        }
      } catch {}
    }
  }
  render(res, 'dict', { word, result });
});

// ===== 添加生词 =====
router.post('/vocab/add', requireAuth, async (req, res) => {
  const { word, definition, phonetic } = req.body;
  try {
    const existing = await Vocab.findOne({ userId: res.locals.user._id, word: word.toLowerCase() });
    if (!existing) {
      await Vocab.create({ userId: res.locals.user._id, word: word.toLowerCase(), definition: definition || '', phonetic: phonetic || '' });
    }
  } catch {}
  res.redirect('/demo/vocab');
});

// ===== 生词本 =====
router.get('/vocab', requireAuth, async (req, res) => {
  const vocabs = await Vocab.find({ userId: res.locals.user._id }).sort({ createdAt: -1 });
  render(res, 'vocab', { vocabs });
});

// ===== 复习 =====
router.get('/vocab/review', requireAuth, async (req, res) => {
  const vocabs = await Vocab.find({ userId: res.locals.user._id, nextReview: { $lte: new Date() } }).sort({ nextReview: 1 });
  if (!vocabs.length) return render(res, 'review', { vocabs: [], msg: '今天没有需要复习的单词' });
  render(res, 'review', { vocabs, msg: null });
});

router.post('/vocab/review/:id', requireAuth, async (req, res) => {
  const quality = parseInt(req.body.quality);
  const vocab = await Vocab.findOne({ _id: req.params.id, userId: res.locals.user._id });
  if (vocab) {
    const result = calculateNextReview(vocab, quality);
    Object.assign(vocab, result, { lastReview: new Date() });
    await vocab.save();
  }
  res.redirect('/demo/vocab/review');
});

// ===== 删除生词 =====
router.post('/vocab/delete/:id', requireAuth, async (req, res) => {
  await Vocab.findOneAndDelete({ _id: req.params.id, userId: res.locals.user._id });
  res.redirect('/demo/vocab');
});

// ===== 语法列表 =====
router.get('/grammar', requireAuth, async (req, res) => {
  const { level, category } = req.query;
  const filter = {};
  if (level) filter.level = level;
  if (category) filter.category = category;
  const grammars = await Grammar.find(filter).sort({ level: 1, category: 1 });
  render(res, 'grammar', { grammars, level, category });
});

// ===== 语法详情 =====
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
  const vocabCount = await Vocab.countDocuments({ userId });
  const reviewCount = await Vocab.countDocuments({ userId, nextReview: { $lte: new Date() } });
  const masteredCount = await Vocab.countDocuments({ userId, repetition: { $gte: 3 } });
  render(res, 'stats', { vocabCount, reviewCount, masteredCount });
});

// ===== AI =====
router.get('/ai', requireAuth, async (req, res) => {
  render(res, 'ai', { result: null, inputText: '', inputWord: '', task: null });
});

router.post('/ai/summarize', requireAuth, async (req, res) => {
  const { text } = req.body;
  const ai = require('../services/ai');
  try {
    const result = await ai.summarize(text, 'both');
    render(res, 'ai', { result, inputText: text, inputWord: '', task: 'summarize' });
  } catch (e) {
    render(res, 'ai', { result: { error: e.message }, inputText: text, inputWord: '', task: 'summarize' });
  }
});

router.post('/ai/analyze', requireAuth, async (req, res) => {
  const { word } = req.body;
  const ai = require('../services/ai');
  try {
    const result = await ai.analyzeWord(word);
    render(res, 'ai', { result, inputText: '', inputWord: word, task: 'analyze' });
  } catch (e) {
    render(res, 'ai', { result: { error: e.message }, inputText: '', inputWord: word, task: 'analyze' });
  }
});

module.exports = router;
