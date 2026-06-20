const { body } = require('express-validator');
const User = require('../models/User');
const ReadingLog = require('../models/ReadingLog');
const Vocab = require('../models/Vocab');
const validate = require('../middlewares/validator');

// 获取个人资料
const getProfile = async (req, res) => {
  res.json({ user: req.user });
};

// 更新个人资料
const updateProfile = [
  body('nickname').optional().trim(),
  body('level').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  body('goal').optional().isIn(['CET4', 'CET6', 'IELTS', 'TOEFL', 'general']),
  body('settings').optional().isObject(),
  validate,
  async (req, res, next) => {
    try {
      const allowedFields = ['nickname', 'avatar', 'level', 'goal', 'settings'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
      });

      res.json({ user });
    } catch (err) {
      next(err);
    }
  },
];

// 学习统计
const getStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 总阅读数和总时长
    const readingStats = await ReadingLog.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalReads: { $sum: 1 },
          totalDuration: { $sum: '$durationSec' },
          avgScore: { $avg: '$exerciseScore' },
        },
      },
    ]);

    // 生词数量
    const vocabCount = await Vocab.countDocuments({ userId });

    // 今日待复习
    const reviewCount = await Vocab.countDocuments({
      userId,
      nextReview: { $lte: new Date() },
    });

    // 最近 7 天阅读趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyTrend = await ReadingLog.aggregate([
      { $match: { userId, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          reads: { $sum: 1 },
          duration: { $sum: '$durationSec' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const stats = readingStats[0] || { totalReads: 0, totalDuration: 0, avgScore: null };

    res.json({
      totalReads: stats.totalReads,
      totalDurationMin: Math.round(stats.totalDuration / 60),
      avgScore: stats.avgScore ? Math.round(stats.avgScore) : null,
      vocabCount,
      reviewCount,
      dailyTrend,
    });
  } catch (err) {
    next(err);
  }
};

// 阅读历史
const getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const [logs, total] = await Promise.all([
      ReadingLog.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('articleId', 'title difficulty category'),
      ReadingLog.countDocuments({ userId: req.user._id }),
    ]);

    res.json({ logs, total });
  } catch (err) {
    next(err);
  }
};

// 记录阅读行为
const addReadingLog = [
  body('articleId').notEmpty().withMessage('文章 ID 不能为空'),
  body('durationSec').optional().isInt({ min: 0 }),
  body('completionRate').optional().isInt({ min: 0, max: 100 }),
  body('exerciseScore').optional().isNumeric(),
  validate,
  async (req, res, next) => {
    try {
      const { articleId, durationSec, completionRate, exerciseScore } = req.body;

      const log = await ReadingLog.create({
        userId: req.user._id,
        articleId,
        startTime: new Date(),
        endTime: new Date(),
        durationSec: durationSec || 0,
        completionRate: completionRate || 0,
        exerciseScore: exerciseScore ?? null,
      });

      res.status(201).json({ log });
    } catch (err) {
      next(err);
    }
  },
];

module.exports = { getProfile, updateProfile, getStats, getHistory, addReadingLog };
