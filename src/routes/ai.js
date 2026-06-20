const { Router } = require('express');
const ai = require('../services/ai');
const auth = require('../middlewares/auth');

const router = Router();

router.use(auth); // AI 功能需要认证

// 文章摘要
router.post('/summarize', async (req, res, next) => {
  try {
    const { text, lang } = req.body;
    if (!text) return res.status(400).json({ error: '请提供文本' });
    const result = await ai.summarize(text, lang);
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
    const result = await ai.translate(text, targetLang);
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
    const result = await ai.generateQuiz(content, count);
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
    const result = await ai.analyzeWord(word);
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
    const result = await ai.grammarExplain(topic);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
