const { Router } = require('express');
const PersonalArticle = require('../models/PersonalArticle');
const auth = require('../middlewares/auth');

const router = Router();
router.use(auth);

// 获取个人文章列表
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, difficulty, category } = req.query;
    const filter = { userId: req.user._id };
    if (difficulty) filter.difficulty = difficulty;
    if (category) filter.category = category;

    const [articles, total] = await Promise.all([
      PersonalArticle.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .select('-content -sentenceTranslations -grammarPoints -questions'),
      PersonalArticle.countDocuments(filter),
    ]);

    res.json({
      articles,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) { next(err); }
});

// 获取单篇文章详情
router.get('/:id', async (req, res, next) => {
  try {
    const article = await PersonalArticle.findOne({ _id: req.params.id, userId: req.user._id });
    if (!article) return res.status(404).json({ error: '文章不存在' });
    res.json({ article });
  } catch (err) { next(err); }
});

// 保存文章到个人库
router.post('/', async (req, res, next) => {
  try {
    const data = { ...req.body, userId: req.user._id };
    const article = await PersonalArticle.create(data);
    res.status(201).json({ article });
  } catch (err) { next(err); }
});

// 更新文章（标记完成、更新分数等）
router.put('/:id', async (req, res, next) => {
  try {
    const article = await PersonalArticle.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!article) return res.status(404).json({ error: '文章不存在' });
    res.json({ article });
  } catch (err) { next(err); }
});

// 删除文章
router.delete('/:id', async (req, res, next) => {
  try {
    const article = await PersonalArticle.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!article) return res.status(404).json({ error: '文章不存在' });
    res.json({ message: '已删除' });
  } catch (err) { next(err); }
});

module.exports = router;
