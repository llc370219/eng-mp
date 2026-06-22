const { Router } = require('express');
const auth = require('../middlewares/auth');
const Article = require('../models/Article');
const PersonalArticle = require('../models/PersonalArticle');
const VocabProgress = require('../models/VocabProgress');
const ReadingProgress = require('../models/ReadingProgress');
const Exercise = require('../models/Exercise');
const Grammar = require('../models/Grammar');
const { tryCheckIn, hasCheckedIn, getCheckInHistory, getStreak } = require('../services/checkin');
const aiService = require('../services/ai');
const { lookupWord } = require('../services/dictionary');
const ebbinghaus = require('../services/ebbinghaus');
const caiyun = require('../services/caiyun');
const articleGenerator = require('../services/articleGenerator');

const router = Router();

// 所有前端数据路由都需要认证
router.use(auth);

// ===== 获取文章列表 =====
router.get('/articles', async (req, res, next) => {
  try {
    const { feed = 'push', difficulty, category, page = 1, pageSize = 6 } = req.query;
    const userId = req.user._id;

    let articles = [];
    let total = 0;

    if (feed === 'private') {
      const filter = { userId };
      if (difficulty) filter.difficulty = difficulty;
      if (category) filter.category = category;

      const skip = (page - 1) * pageSize;
      const [docs, count] = await Promise.all([
        PersonalArticle.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize)).lean(),
        PersonalArticle.countDocuments(filter),
      ]);

      articles = docs.map(a => ({
        id: a._id.toString(),
        title: a.title,
        difficulty: normalizeDifficulty(a.difficulty),
        cat: a.category,
        summaryZh: a.summaryZh || '',
        wordCount: a.wordCount || 0,
        readingTimeMin: a.readingTimeMin || 0,
        color: getDifficultyColor(a.difficulty),
        glyph: '⋆',
        isPrivate: true,
        tags: a.tags || [],
        done: false,
      }));
      total = count;
    } else {
      const filter = { isPublished: true };
      if (difficulty) filter.difficulty = difficulty;
      if (category) filter.category = category;

      const skip = (page - 1) * pageSize;
      const [docs, count] = await Promise.all([
        Article.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize)).lean(),
        Article.countDocuments(filter),
      ]);

      articles = docs.map(a => ({
        id: a._id.toString(),
        title: a.title,
        difficulty: normalizeDifficulty(a.difficulty),
        cat: a.category,
        summaryZh: a.summaryZh || '',
        wordCount: a.wordCount || 0,
        readingTimeMin: a.readingTimeMin || 0,
        color: getDifficultyColor(a.difficulty),
        glyph: getCategoryGlyph(a.category),
        isPrivate: false,
        tags: a.tags || [],
      }));
      total = count;
    }

    res.json({ articles, total, page: Number(page), pageSize: Number(pageSize), totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    next(err);
  }
});

// ===== 获取文章详情 =====
router.get('/article/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    let article = await Article.findById(id).lean();
    let isPrivate = false;

    if (!article) {
      article = await PersonalArticle.findOne({ _id: id, userId }).lean();
      isPrivate = true;
    }

    if (!article) return res.status(404).json({ error: '文章不存在' });

    let exercise = null;
    if (!isPrivate) {
      exercise = await Exercise.findOne({ articleId: article._id }).lean();
    }

    const userVocab = await VocabProgress.find({ userId }).select('word').lean();
    const vocabWords = userVocab.map(v => v.word.toLowerCase());

    if (!isPrivate) {
      await ReadingProgress.findOneAndUpdate(
        { userId, articleId: article._id },
        { $setOnInsert: { startTime: new Date(), status: 'reading', wordCount: article.wordCount } },
        { upsert: true }
      );
    }

    res.json({
      article: { ...article, id: article._id.toString(), isPrivate },
      exercise: exercise ? { questions: exercise.questions || [] } : null,
      vocabWords,
    });
  } catch (err) {
    next(err);
  }
});

// ===== 删除私人文章 =====
router.delete('/article/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const PersonalArticle = require('../models/PersonalArticle');
    const result = await PersonalArticle.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '文章不存在或无权删除' });
    }
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    next(err);
  }
});

// ===== 词典查询（彩云小译为主：音标+中文释义；本地 ECDICT 补充考试标签+英文释义） =====
router.get('/dict/:word', async (req, res, next) => {
  try {
    const word = req.params.word.toLowerCase().trim();
    const isSearchTab = req.query.type === 'search';
    const Dictionary = require('../models/Dictionary');

    if (!isSearchTab) {
      // 2.2 版本：阅读单词卡以本地 ECDICT 库为主，若找不到，则调用彩云小译并缓存，防止本地库未导入时返回「未找到释义」
      let local = await Dictionary.findOne({ word }).lean();
      
      if (!local) {
        // 尝试从彩云小译在线查询并自动缓存
        const cy = await caiyun.dict(word);
        if (cy) {
          try {
            const translation = Array.isArray(cy.explanations) ? cy.explanations.join('\n') : '';
            const newDoc = await Dictionary.findOneAndUpdate(
              { word },
              {
                $set: {
                  word,
                  phonetic: cy.phonetic || '',
                  translation,
                  exampleSentences: cy.examples || []
                }
              },
              { upsert: true, new: true }
            ).lean();
            local = newDoc;
          } catch (saveErr) {
            // 如果保存失败，手动构建临时对象返回，保证接口可用
            local = {
              word,
              phonetic: cy.phonetic || '',
              translation: Array.isArray(cy.explanations) ? cy.explanations.join('\n') : '',
              exampleSentences: cy.examples || []
            };
          }
        }
      }

      if (!local) return res.json({ error: '未在本地词表中找到该词释义' });
      
      let examples = [];
      if (Array.isArray(local.exampleSentences) && local.exampleSentences.length) {
        examples = local.exampleSentences;
      } else if (Array.isArray(local.examples) && local.examples.length) {
        examples = local.examples.map(ex => {
          if (typeof ex === 'string') {
            const parts = ex.split('#');
            return {
              en: parts[0].trim(),
              zh: parts[1] ? parts[1].trim() : ''
            };
          }
          return ex;
        }).filter(ex => ex && ex.en);
      }

      return res.json({
        word: local.word,
        phonetic: local.phonetic || '',
        translation: local.translation || '',
        definitionEn: local.definitionEn || '',
        tag: local.tag || '',
        synonym: [],
        examples: examples.slice(0, 2),
        source: 'local'
      });
    }

    // 独立搜索页：保持彩云小译优先 + 本地 ECDICT 补充的模式
    const [cy, local] = await Promise.all([
      caiyun.dict(word),
      Dictionary.findOne({ word }).lean(),
    ]);

    // 彩云与本地都没有 → 退回原在线英文兜底
    if (!cy && !local) {
      const fb = await lookupWord(word);
      if (!fb) return res.json({ error: '未找到释义' });
      return res.json({ word: fb.word, phonetic: fb.phonetic || '', translation: fb.translation || '', definitionEn: fb.definitionEn || '', tag: fb.tag || '', synonym: [], source: fb.source || 'fallback' });
    }

    if (cy) {
      try {
        const updateData = { $set: {} };
        if (cy.phonetic) updateData.$set.phonetic = cy.phonetic;
        if (Array.isArray(cy.explanations) && cy.explanations.length) {
          updateData.$set.translation = cy.explanations.join('\n');
        }
        if (Array.isArray(cy.examples) && cy.examples.length) {
          updateData.$set.exampleSentences = cy.examples.slice(0, 2);
        }
        if (Object.keys(updateData.$set).length > 0) {
          await Dictionary.updateOne(
            { word },
            updateData,
            { upsert: true }
          ).exec();
        }
      } catch (saveErr) {
        // 静默失败
      }
    }

    res.json({
      word: (cy && cy.word) || (local && local.word) || word,
      phonetic: (cy && cy.phonetic) || (local && local.phonetic) || '',
      translation: cy ? cy.explanations.join('\n') : (local ? local.translation : ''),  // 中文释义（主，彩云优先）
      definitionEn: (local && local.definitionEn) || '',                                 // 英文释义（ECDICT）
      tag: (local && local.tag) || '',                                                   // 考试标签（ECDICT）
      synonym: (cy && cy.synonym) || [],
      source: cy ? 'caiyun' : 'local',
    });
  } catch (err) {
    res.json({ error: '查询失败: ' + err.message });
  }
});

// ===== 单词例句（使用本地数据库缓存，不调用 API 实时生成） =====
router.get('/dict/:word/examples', async (req, res, next) => {
  try {
    const Dictionary = require('../models/Dictionary');
    const word = req.params.word.toLowerCase().trim();
    const doc = await Dictionary.findOne({ word });
    if (doc) {
      if (Array.isArray(doc.exampleSentences) && doc.exampleSentences.length) {
        return res.json({ examples: doc.exampleSentences, cached: true });
      }
      if (Array.isArray(doc.examples) && doc.examples.length) {
        const parsed = doc.examples.map(ex => {
          if (typeof ex === 'string') {
            const parts = ex.split('#');
            return {
              en: parts[0].trim(),
              zh: parts[1] ? parts[1].trim() : ''
            };
          }
          return ex;
        }).filter(ex => ex && ex.en);
        if (parsed.length) {
          return res.json({ examples: parsed, cached: true });
        }
      }
    }
    res.json({ examples: [] });
  } catch (err) {
    res.json({ examples: [] });
  }
});

// ===== 句子翻译 =====
router.post('/translate', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: '请提供文本' });
    const result = await aiService.translate(text, 'zh');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ===== 语法解析 =====
router.post('/grammar', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: '请提供文本' });
    const result = await aiService.grammarExplain(text);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ===== 生词本 =====
router.get('/vocab', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { filter = 'all' } = req.query;

    const query = { userId };
    if (filter === 'learning') query.masteryLevel = 'new';
    else if (filter === 'review') query.masteryLevel = 'learning';
    else if (filter === 'mastered') query.masteryLevel = 'mastered';

    const vocabs = await VocabProgress.find(query).sort({ nextReview: 1 }).lean();

    const [learningCount, reviewCount, masteredCount] = await Promise.all([
      VocabProgress.countDocuments({ userId, masteryLevel: 'new' }),
      VocabProgress.countDocuments({ userId, masteryLevel: 'learning' }),
      VocabProgress.countDocuments({ userId, masteryLevel: 'mastered' }),
    ]);

    const now = new Date();
    const vocabList = vocabs.map(v => {
      const minutesUntil = v.nextReview ? (new Date(v.nextReview) - now) / 60000 : 0;
      const due = minutesUntil <= 0;
      return {
        word: v.word,
        phon: v.phonetic || '',
        def: v.definition || '',
        mastery: v.masteryLevel === 'new' ? 'learning' : v.masteryLevel,
        due,
        nextReview: v.nextReview,
        stage: v.repetition || 0,                                   // 艾宾浩斯 stage
        nextReviewLabel: due ? '待复习' : ebbinghaus.humanize(minutesUntil),
        reviewPreview: ebbinghaus.preview(v.repetition || 0),       // 四个按钮各自会排到多久后
      };
    });

    res.json({
      vocabs: vocabList,
      total: vocabs.length,
      counts: { all: vocabs.length, learning: learningCount, review: reviewCount, mastered: masteredCount },
    });
  } catch (err) {
    next(err);
  }
});

// ===== 添加生词 =====
router.post('/vocab/add', async (req, res, next) => {
  try {
    const { word, definition, phonetic } = req.body;
    const userId = req.user._id;

    const existing = await VocabProgress.findOne({ userId, word: word.toLowerCase() });
    if (existing) return res.json({ success: true, message: '已在生词本中' });

    await VocabProgress.create({
      userId,
      word: word.toLowerCase(),
      definition: definition || '',
      phonetic: phonetic || '',
      masteryLevel: 'new',
      nextReview: new Date(),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ===== 删除生词 =====
router.delete('/vocab/:word', async (req, res, next) => {
  try {
    const userId = req.user._id;
    await VocabProgress.findOneAndDelete({ userId, word: req.params.word.toLowerCase() });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ===== 复习生词（艾宾浩斯遗忘曲线） =====
router.post('/vocab/review', async (req, res, next) => {
  try {
    const { word, quality } = req.body; // 1 忘了 / 3 困难 / 4 记得 / 5 简单
    const userId = req.user._id;

    const vocab = await VocabProgress.findOne({ userId, word: word.toLowerCase() });
    if (!vocab) return res.status(404).json({ error: '生词不存在' });

    // 按艾宾浩斯曲线推进/回退 stage 并计算下次复习时间
    const result = ebbinghaus.schedule(vocab, Number(quality));
    vocab.repetition = result.stage;                                  // stage = 已成功复习次数
    vocab.interval = Math.round((result.intervalMinutes / 1440) * 10) / 10; // 间隔（天，用于展示）
    vocab.nextReview = result.nextReview;
    vocab.lastReview = new Date();
    vocab.masteryLevel = result.masteryLevel;
    vocab.totalReviews = (vocab.totalReviews || 0) + 1;
    if (Number(quality) >= 3) vocab.correctReviews = (vocab.correctReviews || 0) + 1;
    vocab.lastScore = Number(quality);

    await vocab.save();

    res.json({
      success: true,
      stage: result.stage,
      nextReview: result.nextReview,
      nextReviewLabel: ebbinghaus.humanize(result.intervalMinutes),
      masteryLevel: result.masteryLevel,
    });
  } catch (err) {
    next(err);
  }
});

// ===== 打卡 =====
router.get('/checkin', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = await hasCheckedIn(userId);
    const streakObj = await getStreak(userId);
    const history = await getCheckInHistory(userId, 90);
    res.json({ today, streak: streakObj.current || 0, streakMax: streakObj.max || 0, history });
  } catch (err) {
    next(err);
  }
});

router.post('/checkin', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await tryCheckIn(userId, { type: 'manual' });
    const streakObj = await getStreak(userId);
    res.json({ success: true, qualified: result.qualified, streak: streakObj.current || 0 });
  } catch (err) {
    next(err);
  }
});

// ===== 统计数据 =====
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user._id;

    const ReadingLog = require('../models/ReadingLog');
    const WrongAnswer = require('../models/WrongAnswer');

    const readingStats = await ReadingLog.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalReads: { $sum: 1 }, totalDuration: { $sum: '$durationSec' }, avgScore: { $avg: '$exerciseScore' } } },
    ]);

    const [vocabCount, masteredCount, reviewCount] = await Promise.all([
      VocabProgress.countDocuments({ userId }),
      VocabProgress.countDocuments({ userId, masteryLevel: 'mastered' }),
      VocabProgress.countDocuments({ userId, nextReview: { $lte: new Date() } }),
    ]);

    const streakObj = await getStreak(userId);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyTrend = await ReadingLog.aggregate([
      { $match: { userId, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, reads: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const vocabGrowth = await VocabProgress.aggregate([
      { $match: { userId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const stats = readingStats[0] || { totalReads: 0, totalDuration: 0, avgScore: null };

    res.json({
      totalReads: stats.totalReads,
      totalDurationMin: Math.round(stats.totalDuration / 60),
      avgScore: stats.avgScore ? Math.round(stats.avgScore) : null,
      vocabCount,
      vocabMastered: masteredCount,
      reviewCount,
      streak: streakObj.current || 0,
      streakMax: streakObj.max || 0,
      dailyTrend,
      vocabGrowth,
    });
  } catch (err) {
    next(err);
  }
});

// ===== AI 生成文章（完整版，读取等级和生词本） =====
router.post('/generate-article', async (req, res, next) => {
  try {
    const { prompt, level, category, wordCount, useVocab } = req.body;
    const userId = req.user._id;

    if (!prompt) return res.status(400).json({ error: '请提供文章主题' });

    const validLevels = ['初中', '高中', 'CET4', 'CET6', '考研', '雅思'];
    const articleLevel = validLevels.includes(level) ? level : '高中';

    // 读取用户生词本
    let vocabWords = [];
    let vocabDetails = [];
    if (useVocab !== false) {
      vocabDetails = await VocabProgress.find({ userId })
        .select('word masteryLevel definition phonetic')
        .sort({ masteryLevel: 1, nextReview: 1 })
        .limit(50)
        .lean();
      vocabWords = vocabDetails.map(v => v.word);
    }

    // wordCount 为 0 / 空 → 自动：按难度选择合适长度，并让 AI 灵活决定
    const isAuto = !wordCount || Number(wordCount) <= 0;
    const levelDefaults = { '初中': 150, '高中': 250, 'CET4': 300, 'CET6': 400, '考研': 500, '雅思': 550 };
    const finalWordCount = isAuto ? (levelDefaults[articleLevel] || 300) : Number(wordCount);

    const opts = {
      vocabWords,
      vocabDetails,
      category: category || 'life',
      wordCount: finalWordCount,
      extraRequirements: isAuto
        ? `请根据「${articleLevel}」难度自动选择最合适的文章长度（约 ${finalWordCount} 词上下，可按主题灵活调整），包含标题、正文、中文摘要。`
        : `生成约 ${finalWordCount} 字的文章，包含标题、正文、中文摘要。`,
    };

    // 统一入口：有 AI Key 走真实生成，无 Key 走测试样例（彩云真实翻译），整条链路始终可用
    const result = await articleGenerator.generate(prompt, articleLevel, opts);
    if (result.error) return res.status(500).json({ error: result.error });

    // 保存到私人文章库
    try {
      const saved = await PersonalArticle.create({
        userId,
        title: result.title,
        content: result.content,
        summaryZh: result.summaryZh,
        difficulty: result.difficulty || articleLevel,
        category: result.category || category || 'life',
        tags: result.tags || [],
        wordCount: result.wordCount || wordCount || 300,
        readingTimeMin: result.readingTimeMin || Math.ceil((result.wordCount || 300) / 100),
        highlightedVocab: result.highlightedVocab || [],
        sentenceTranslations: result.sentenceTranslations || [],
        grammarPoints: result.grammarPoints || [],
        questions: result.questions || [],
        source: 'ai',
        prompt: prompt,
      });
      result._id = saved._id;
      result.saved = true;
    } catch (saveErr) {
      result.saved = false;
      result.saveError = saveErr.message;
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ===== 语法列表 =====
router.get('/grammar', async (req, res, next) => {
  try {
    const { level, category } = req.query;
    const filter = {};
    if (level) filter.level = level;
    if (category) filter.category = category;

    const grammars = await Grammar.find(filter).sort({ createdAt: -1 }).limit(50).lean();

    res.json({
      grammars: grammars.map(g => ({
        id: g._id.toString(),
        title: g.title,
        en: g.titleEn || '',
        level: normalizeDifficulty(g.level),
        cat: g.category,
        color: getDifficultyColor(g.level),
        desc: (g.explanation || '').slice(0, 50),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ===== 语法详情（映射成前端阅读视图需要的字段名） =====
router.get('/grammar/:id', async (req, res, next) => {
  try {
    const g = await Grammar.findById(req.params.id).lean();
    if (!g) return res.status(404).json({ error: '语法点不存在' });
    res.json({
      grammar: {
        id: g._id.toString(),
        title: g.title,
        en: g.titleEn || '',
        level: normalizeDifficulty(g.level),
        cat: g.category,
        color: getDifficultyColor(g.level),
        explanation: g.explanation || '',
        examples: (g.examples || []).map(e => ({ sentence: e.sentence, zh: e.translation || '', hl: e.highlight || '' })),
        exercises: (g.exercises || []).map(ex => ({ text: ex.text, opts: ex.options || [], answer: ex.answer, explanation: ex.explanation || '' })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ===== 辅助函数 =====
// 后端枚举用 CET4/CET6（无连字符），前端显示用 CET-4/CET-6，这里统一成前端格式
function normalizeDifficulty(d) {
  if (d === 'CET4') return 'CET-4';
  if (d === 'CET6') return 'CET-6';
  return d;
}

function getDifficultyColor(difficulty) {
  const colors = { '初中': '#f3c44b', '高中': '#ec6a2b', 'CET4': '#2f7fd6', 'CET-4': '#2f7fd6', 'CET6': '#1f9d5c', 'CET-6': '#1f9d5c', '考研': '#9b59b6', '雅思': '#e34e98' };
  return colors[difficulty] || '#ec6a2b';
}

function getCategoryGlyph(category) {
  const glyphs = { 'science': '✺', 'life': '❧', 'literature': '❦', 'business': '☕', 'tech': '⚡', 'news': '✦' };
  return glyphs[category] || '✦';
}

module.exports = router;
