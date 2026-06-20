const { body, query } = require('express-validator');
const Article = require('../models/Article');
const Exercise = require('../models/Exercise');
const ReadingLog = require('../models/ReadingLog');
const { analyzeDifficulty } = require('../services/difficulty-analyzer');
const { getDailyRecommendations } = require('../services/recommendation');
const validate = require('../middlewares/validator');

// 文章列表
const list = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('difficulty').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  query('category').optional().isIn(['tech', 'life', 'news', 'literature', 'science', 'business']),
  query('tag').optional().trim(),
  validate,
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20, difficulty, category, tag } = req.query;
      const filter = { isPublished: true };

      if (difficulty) filter.difficulty = difficulty;
      if (category) filter.category = category;
      if (tag) filter.tags = tag;

      const [articles, total] = await Promise.all([
        Article.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .select('-content'),
        Article.countDocuments(filter),
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
    } catch (err) {
      next(err);
    }
  },
];

// 文章详情
const detail = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const exercise = await Exercise.findOne({ articleId: article._id });
    res.json({ article, exercise });
  } catch (err) {
    next(err);
  }
};

// 每日推荐
const daily = async (req, res, next) => {
  try {
    const userLevel = req.user?.level || 'B1';
    const limit = Number(req.query.limit) || 5;

    const result = await getDailyRecommendations(
      req.user?._id,
      userLevel,
      limit
    );

    if (result.articles.length === 0) {
      return res.status(404).json({ error: '暂无推荐文章' });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// 搜索
const search = [
  query('q').notEmpty().withMessage('请输入搜索关键词'),
  validate,
  async (req, res, next) => {
    try {
      const { q, page = 1, limit = 20 } = req.query;

      const filter = {
        isPublished: true,
        $text: { $search: q },
      };

      const [articles, total] = await Promise.all([
        Article.find(filter, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .skip((page - 1) * limit)
          .limit(limit)
          .select('-content'),
        Article.countDocuments(filter),
      ]);

      res.json({ articles, total });
    } catch (err) {
      next(err);
    }
  },
];

// 创建文章（管理员）
const create = [
  body('title').notEmpty().withMessage('标题不能为空'),
  body('content').notEmpty().withMessage('内容不能为空'),
  body('difficulty').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  body('category').isIn(['tech', 'life', 'news', 'literature', 'science', 'business']),
  validate,
  async (req, res, next) => {
    try {
      const { title, content, difficulty, category, tags, source, isPublished } = req.body;

      // 自动分析难度
      const analysis = analyzeDifficulty(content);

      const article = await Article.create({
        title,
        content,
        difficulty: difficulty || analysis.difficulty,
        category,
        tags: tags || [],
        source: source || '',
        wordCount: analysis.wordCount,
        readingTimeMin: analysis.readingTimeMin,
        isPublished: isPublished || false,
      });

      res.status(201).json({ article });
    } catch (err) {
      next(err);
    }
  },
];

// 更新文章（管理员）
const update = [
  body('title').optional().trim(),
  body('content').optional().trim(),
  body('difficulty').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  body('category').optional().isIn(['tech', 'life', 'news', 'literature', 'science', 'business']),
  validate,
  async (req, res, next) => {
    try {
      const updates = { ...req.body };

      // 如果内容更新了，重新分析难度
      if (updates.content) {
        const analysis = analyzeDifficulty(updates.content);
        updates.wordCount = analysis.wordCount;
        updates.readingTimeMin = analysis.readingTimeMin;
        if (!updates.difficulty) {
          updates.difficulty = analysis.difficulty;
        }
      }

      const article = await Article.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      });

      if (!article) {
        return res.status(404).json({ error: '文章不存在' });
      }

      res.json({ article });
    } catch (err) {
      next(err);
    }
  },
];

// 删除文章（管理员）
const remove = async (req, res, next) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 同时删除关联的练习
    await Exercise.deleteMany({ articleId: req.params.id });

    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, detail, daily, search, create, update, remove };
