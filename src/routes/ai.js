const { Router } = require('express');
const ai = require('../services/ai');
const auth = require('../middlewares/auth');
const VocabProgress = require('../models/VocabProgress');
const PersonalArticle = require('../models/PersonalArticle');

const router = Router();

// AI 功能需要认证
router.use(auth);

// 获取可用 AI 提供商列表
router.get('/providers', async (req, res) => {
  try {
    const aiConfig = await ai.getAIConfig();
    const providers = Object.entries(ai.PROVIDERS).map(([key, p]) => ({
      key,
      name: p.name,
      defaultModel: p.defaultModel,
      configured: !!aiConfig.keys[key],
      isDefault: key === aiConfig.provider,
    }));

    res.json({
      current: aiConfig.provider,
      currentModel: aiConfig.model || ai.PROVIDERS[aiConfig.provider]?.defaultModel,
      providers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 通用参数提取：从 body 中取 provider 和 model
function getOptions(body) {
  const opts = {};
  if (body.provider) opts.provider = body.provider;
  if (body.model) opts.model = body.model;
  return opts;
}

// 文章摘要
router.post('/summarize', async (req, res, next) => {
  try {
    const { text, lang } = req.body;
    if (!text) return res.status(400).json({ error: '请提供文本' });
    const result = await ai.summarize(text, lang, getOptions(req.body));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 翻译
router.post('/translate', async (req, res, next) => {
  try {
    const { text, targetLang } = req.body;
    if (!text) return res.status(400).json({ error: '请提供文本' });
    const result = await ai.translate(text, targetLang, getOptions(req.body));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 生成练习题
router.post('/generate-quiz', async (req, res, next) => {
  try {
    const { content, count } = req.body;
    if (!content) return res.status(400).json({ error: '请提供文章内容' });
    const result = await ai.generateQuiz(content, count, getOptions(req.body));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 单词解析
router.post('/analyze-word', async (req, res, next) => {
  try {
    const { word } = req.body;
    if (!word) return res.status(400).json({ error: '请提供单词' });
    const result = await ai.analyzeWord(word, getOptions(req.body));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 语法讲解
router.post('/grammar-explain', async (req, res, next) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: '请提供语法主题' });
    const result = await ai.grammarExplain(topic, getOptions(req.body));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// AI 生成文章（自动保存到私人文章库）
router.post('/generate-article', async (req, res, next) => {
  let vocabDetails = null;
  try {
    const { prompt, level, category, minVocabCount, extraRequirements } = req.body;
    if (!prompt) return res.status(400).json({ error: '请提供文章主题或提示信息' });
    const validLevels = ['初中', '高中', 'CET4', 'CET6', '雅思'];
    const articleLevel = validLevels.includes(level) ? level : '高中';

    // 读取用户生词本（含掌握程度，按优先级排序：new > learning > review > mastered）
    vocabDetails = await VocabProgress.find({ userId: req.user._id })
      .select('word masteryLevel definition phonetic -_id')
      .sort({ masteryLevel: 1, nextReview: 1 })
      .limit(80)
      .lean();

    const vocabWords = vocabDetails.map(v => v.word);

    const opts = {
      ...getOptions(req.body),
      vocabWords,
      vocabDetails,
      category: category || 'life',
      minVocabCount: minVocabCount || 3,
      extraRequirements: extraRequirements || '',
    };

    const result = await ai.generateArticle(prompt, articleLevel, opts);
    if (result.error) return res.status(500).json({ error: result.error });

    // 自动保存到私人文章库
    try {
      const saved = await PersonalArticle.create({
        userId: req.user._id,
        title: result.title,
        content: result.content,
        summaryZh: result.summaryZh,
        difficulty: result.difficulty,
        category: result.category,
        tags: result.tags,
        wordCount: result.wordCount,
        readingTimeMin: result.readingTimeMin,
        highlightedVocab: result.highlightedVocab,
        sentenceTranslations: result.sentenceTranslations,
        grammarPoints: result.grammarPoints,
        questions: result.questions,
        source: 'ai',
        prompt: prompt,
      });
      result._id = saved._id;
      result.saved = true;
    } catch (saveErr) {
      // 保存失败不影响返回文章内容
      result.saved = false;
      result.saveError = saveErr.message;
    }

    res.json(result);
  } catch (err) {
    next(err);
  } finally {
    // 清理上下文，释放内存
    vocabDetails = null;
  }
});

module.exports = router;
