const { Router } = require('express');
const ai = require('../services/ai');
const config = require('../config');
const auth = require('../middlewares/auth');

const router = Router();

// AI 功能需要认证
router.use(auth);

// 获取可用 AI 提供商列表
router.get('/providers', (req, res) => {
  const providers = Object.entries(ai.PROVIDERS).map(([key, p]) => ({
    key,
    name: p.name,
    defaultModel: p.defaultModel,
    configured: !!config.ai.keys[key],
    isDefault: key === config.ai.provider,
  }));

  res.json({
    current: config.ai.provider,
    currentModel: config.ai.model || ai.PROVIDERS[config.ai.provider]?.defaultModel,
    providers,
  });
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

module.exports = router;
