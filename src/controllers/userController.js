const { body } = require('express-validator');
const User = require('../models/User');
const ReadingLog = require('../models/ReadingLog');
const Vocab = require('../models/Vocab');
const WrongAnswer = require('../models/WrongAnswer');
const validate = require('../middlewares/validator');

// 获取个人资料
const getProfile = async (req, res) => {
  res.json({ user: req.user });
};

// 更新个人资料
const updateProfile = [
  body('nickname').optional().trim(),
  body('level').optional().isIn(['初中', '高中', 'CET4', 'CET6', '雅思']),
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

    // 生词统计
    const [vocabCount, reviewCount, masteredCount] = await Promise.all([
      Vocab.countDocuments({ userId }),
      Vocab.countDocuments({ userId, nextReview: { $lte: new Date() } }),
      Vocab.countDocuments({ userId, repetition: { $gte: 3 } }),
    ]);

    // 错题统计
    const [wrongTotal, wrongUnmastered] = await Promise.all([
      WrongAnswer.countDocuments({ userId }),
      WrongAnswer.countDocuments({ userId, mastered: false }),
    ]);

    // 连续学习天数
    const streak = await calculateStreak(userId);

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
          avgScore: { $avg: '$exerciseScore' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 最近 30 天词汇增长
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const vocabGrowth = await Vocab.aggregate([
      { $match: { userId, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 本周统计
    const weekStart = getWeekStart();
    const [weekReads, weekDuration] = await Promise.all([
      ReadingLog.countDocuments({ userId, createdAt: { $gte: weekStart } }),
      ReadingLog.aggregate([
        { $match: { userId, createdAt: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$durationSec' } } },
      ]),
    ]);

    // 本月统计
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [monthReads, monthVocab] = await Promise.all([
      ReadingLog.countDocuments({ userId, createdAt: { $gte: monthStart } }),
      Vocab.countDocuments({ userId, createdAt: { $gte: monthStart } }),
    ]);

    const stats = readingStats[0] || { totalReads: 0, totalDuration: 0, avgScore: null };

    res.json({
      // 总览
      totalReads: stats.totalReads,
      totalDurationMin: Math.round(stats.totalDuration / 60),
      avgScore: stats.avgScore ? Math.round(stats.avgScore) : null,

      // 词汇
      vocabCount,
      vocabMastered: masteredCount,
      reviewCount,

      // 错题
      wrongTotal,
      wrongUnmastered,

      // 连续天数
      streak,

      // 本周
      weekReads,
      weekDurationMin: weekDuration[0] ? Math.round(weekDuration[0].total / 60) : 0,

      // 本月
      monthReads,
      monthVocab,

      // 趋势
      dailyTrend,
      vocabGrowth,
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

// ===== 辅助函数 =====

// 计算连续学习天数
async function calculateStreak(userId) {
  const logs = await ReadingLog.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  if (logs.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  for (const log of logs) {
    const logDate = new Date(log._id + 'T00:00:00');
    const diffDays = Math.round((checkDate - logDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0 || (streak === 0 && diffDays === 1)) {
      // 今天有记录，或者昨天有记录（今天还没学）
      streak++;
      checkDate = new Date(logDate);
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (diffDays > 1) {
      // 断了
      break;
    }
  }

  return streak;
}

// 获取本周一日期
function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // 周一为一周开始
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

module.exports = { getProfile, updateProfile, getStats, getHistory, addReadingLog };
