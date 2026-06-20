const { body } = require('express-validator');
const Vocab = require('../models/Vocab');
const { calculateNextReview } = require('../services/spaced-repetition');
const validate = require('../middlewares/validator');

// 添加生词
const add = [
  body('word').notEmpty().withMessage('单词不能为空'),
  body('definition').optional().trim(),
  body('phonetic').optional().trim(),
  body('example').optional().trim(),
  body('context').optional().trim(),
  body('articleId').optional().trim(),
  validate,
  async (req, res, next) => {
    try {
      const { word, definition, phonetic, example, context, articleId } = req.body;

      const existing = await Vocab.findOne({ userId: req.user._id, word: word.toLowerCase() });
      if (existing) {
        return res.status(409).json({ error: '该单词已在生词本中' });
      }

      const vocab = await Vocab.create({
        userId: req.user._id,
        word: word.toLowerCase(),
        definition: definition || '',
        phonetic: phonetic || '',
        example: example || '',
        context: context || '',
        articleId: articleId || null,
      });

      res.status(201).json({ vocab });
    } catch (err) {
      next(err);
    }
  },
];

// 生词列表
const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const [vocabs, total] = await Promise.all([
      Vocab.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Vocab.countDocuments({ userId: req.user._id }),
    ]);

    res.json({ vocabs, total });
  } catch (err) {
    next(err);
  }
};

// 获取今日待复习单词
const review = async (req, res, next) => {
  try {
    const now = new Date();
    const vocabs = await Vocab.find({
      userId: req.user._id,
      nextReview: { $lte: now },
    }).sort({ nextReview: 1 });

    res.json({ vocabs, count: vocabs.length });
  } catch (err) {
    next(err);
  }
};

// 提交复习评分
const submitReview = [
  body('quality').isInt({ min: 0, max: 5 }).withMessage('评分必须在 0-5 之间'),
  validate,
  async (req, res, next) => {
    try {
      const { quality } = req.body;
      const vocab = await Vocab.findOne({
        _id: req.params.id,
        userId: req.user._id,
      });

      if (!vocab) {
        return res.status(404).json({ error: '单词不存在' });
      }

      const result = calculateNextReview(vocab, quality);
      Object.assign(vocab, result, { lastReview: new Date() });
      await vocab.save();

      res.json({ vocab });
    } catch (err) {
      next(err);
    }
  },
];

// 更新生词
const update = [
  body('definition').optional().trim(),
  body('example').optional().trim(),
  validate,
  async (req, res, next) => {
    try {
      const vocab = await Vocab.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        req.body,
        { new: true, runValidators: true }
      );

      if (!vocab) {
        return res.status(404).json({ error: '单词不存在' });
      }

      res.json({ vocab });
    } catch (err) {
      next(err);
    }
  },
];

// 删除生词
const remove = async (req, res, next) => {
  try {
    const vocab = await Vocab.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!vocab) {
      return res.status(404).json({ error: '单词不存在' });
    }

    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
};

module.exports = { add, list, review, submitReview, update, remove };
