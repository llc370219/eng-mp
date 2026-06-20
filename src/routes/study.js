const { Router } = require('express');
const { body, query } = require('express-validator');
const StudySession = require('../models/StudySession');
const ReadingProgress = require('../models/ReadingProgress');
const VocabProgress = require('../models/VocabProgress');
const StudyGoal = require('../models/StudyGoal');
const Article = require('../models/Article');
const { hasCheckedIn, tryCheckIn, getCheckInHistory, getStreak } = require('../services/checkin');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validator');

const router = Router();
router.use(auth);

// ===== 学习会话 =====

// 开始学习会话
router.post('/session/start', async (req, res, next) => {
  try {
    const session = await StudySession.create({
      userId: req.user._id,
      startTime: new Date(),
    });
    res.status(201).json({ session });
  } catch (err) { next(err); }
});

// 结束学习会话
router.post('/session/:id/end', async (req, res, next) => {
  try {
    const session = await StudySession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ error: '会话不存在' });

    session.endTime = new Date();
    session.durationMin = Math.round((session.endTime - session.startTime) / 60000);

    // 记录活动
    if (req.body.activities) {
      session.activities = req.body.activities;
    }

    await session.save();
    res.json({ session });
  } catch (err) { next(err); }
});

// ===== 阅读进度 =====

// 更新阅读进度
router.post('/reading/update', [
  body('articleId').notEmpty(),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('durationSec').optional().isInt({ min: 0 }),
  validate,
], async (req, res, next) => {
  try {
    const { articleId, progress, durationSec, status, exerciseScore, exerciseResults, lastPosition } = req.body;

    const article = await Article.findById(articleId);
    if (!article) return res.status(404).json({ error: '文章不存在' });

    const update = {};
    if (progress !== undefined) update.progress = progress;
    if (durationSec !== undefined) update.durationSec = durationSec;
    if (status !== undefined) update.status = status;
    if (exerciseScore !== undefined) update.exerciseScore = exerciseScore;
    if (exerciseResults !== undefined) update.exerciseResults = exerciseResults;
    if (lastPosition !== undefined) update.lastPosition = lastPosition;
    if (status === 'completed') update.endTime = new Date();
    update.wordCount = article.wordCount;

    const readingProgress = await ReadingProgress.findOneAndUpdate(
      { userId: req.user._id, articleId },
      { $set: update, $setOnInsert: { startTime: new Date() } },
      { upsert: true, new: true }
    );

    res.json({ readingProgress });
  } catch (err) { next(err); }
});

// 阅读历史
router.get('/reading/history', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const [history, total] = await Promise.all([
      ReadingProgress.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('articleId', 'title difficulty category wordCount'),
      ReadingProgress.countDocuments(filter),
    ]);

    res.json({ history, total });
  } catch (err) { next(err); }
});

// ===== 学习统计 =====

// 总览统计
router.get('/stats/overview', async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [
      vocabTotal, vocabMastered, reviewDue,
      readingTotal, readingCompleted,
      sessionStats
    ] = await Promise.all([
      VocabProgress.countDocuments({ userId }),
      VocabProgress.countDocuments({ userId, masteryLevel: 'mastered' }),
      VocabProgress.countDocuments({ userId, nextReview: { $lte: new Date() } }),
      ReadingProgress.countDocuments({ userId }),
      ReadingProgress.countDocuments({ userId, status: 'completed' }),
      StudySession.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalMin: { $sum: '$durationMin' }, count: { $sum: 1 } } },
      ]),
    ]);

    const avgScore = await ReadingProgress.aggregate([
      { $match: { userId, exerciseScore: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$exerciseScore' } } },
    ]);

    const totalWordsRead = await ReadingProgress.aggregate([
      { $match: { userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$wordCount' } } },
    ]);

    res.json({
      totalStudyMin: sessionStats[0]?.totalMin || 0,
      totalSessions: sessionStats[0]?.count || 0,
      readingTotal,
      readingCompleted,
      totalWordsRead: totalWordsRead[0]?.total || 0,
      avgScore: avgScore[0]?.avg ? Math.round(avgScore[0].avg) : null,
      vocabTotal,
      vocabMastered,
      reviewDue,
    });
  } catch (err) { next(err); }
});

// 趋势数据
router.get('/stats/trend', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [vocabTrend, readingTrend, sessionTrend] = await Promise.all([
      VocabProgress.aggregate([
        { $match: { userId, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      ReadingProgress.aggregate([
        { $match: { userId, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, words: { $sum: '$wordCount' } } },
        { $sort: { _id: 1 } },
      ]),
      StudySession.aggregate([
        { $match: { userId, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } }, minutes: { $sum: '$durationMin' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({ vocabTrend, readingTrend, sessionTrend, days });
  } catch (err) { next(err); }
});

// 连续学习天数
router.get('/stats/streak', async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 合并所有学习活动的日期
    const [vocabDates, readingDates, sessionDates] = await Promise.all([
      VocabProgress.aggregate([
        { $match: { userId } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } },
      ]),
      ReadingProgress.aggregate([
        { $match: { userId } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } },
      ]),
      StudySession.aggregate([
        { $match: { userId } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } },
      ]),
    ]);

    // 合并去重
    const allDates = new Set();
    [...vocabDates, ...readingDates, ...sessionDates].forEach(d => allDates.add(d._id));
    const sortedDates = [...allDates].sort().reverse();

    // 计算连续天数
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(today);
    for (const dateStr of sortedDates) {
      const d = new Date(dateStr + 'T00:00:00');
      const diff = Math.round((checkDate - d) / 86400000);

      if (diff === 0 || (currentStreak === 0 && diff === 1)) {
        currentStreak++;
        checkDate = new Date(d);
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (diff > 1) {
        break;
      }
    }

    // 计算最长连续
    const allSorted = [...allDates].sort();
    tempStreak = 1;
    maxStreak = 1;
    for (let i = 1; i < allSorted.length; i++) {
      const prev = new Date(allSorted[i - 1] + 'T00:00:00');
      const curr = new Date(allSorted[i] + 'T00:00:00');
      if ((curr - prev) === 86400000) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    // 本周和本月天数
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const weekDays = [...allDates].filter(d => new Date(d + 'T00:00:00') >= weekStart).length;
    const monthDays = [...allDates].filter(d => new Date(d + 'T00:00:00') >= monthStart).length;

    res.json({ currentStreak, maxStreak, weekDays, monthDays, totalActiveDays: allDates.size });
  } catch (err) { next(err); }
});

// ===== 学习报告 =====

// 今日报告
router.get('/report/daily', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [sessions, readings, vocabs, reviews] = await Promise.all([
      StudySession.aggregate([
        { $match: { userId, createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, totalMin: { $sum: '$durationMin' } } },
      ]),
      ReadingProgress.countDocuments({ userId, createdAt: { $gte: today, $lt: tomorrow } }),
      VocabProgress.countDocuments({ userId, createdAt: { $gte: today, $lt: tomorrow } }),
      VocabProgress.countDocuments({ userId, lastReview: { $gte: today, $lt: tomorrow } }),
    ]);

    const scores = await ReadingProgress.aggregate([
      { $match: { userId, exerciseScore: { $ne: null }, updatedAt: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, avg: { $avg: '$exerciseScore' } } },
    ]);

    res.json({
      studyMin: sessions[0]?.totalMin || 0,
      articlesRead: readings,
      newWords: vocabs,
      wordsReviewed: reviews,
      avgScore: scores[0]?.avg ? Math.round(scores[0].avg) : null,
    });
  } catch (err) { next(err); }
});

// 本周报告
router.get('/report/weekly', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

    const [sessions, readings, vocabs, reviews] = await Promise.all([
      StudySession.aggregate([
        { $match: { userId, createdAt: { $gte: weekStart } } },
        { $group: { _id: null, totalMin: { $sum: '$durationMin' } } },
      ]),
      ReadingProgress.countDocuments({ userId, status: 'completed', createdAt: { $gte: weekStart } }),
      VocabProgress.countDocuments({ userId, createdAt: { $gte: weekStart } }),
      VocabProgress.countDocuments({ userId, lastReview: { $gte: weekStart } }),
    ]);

    res.json({
      totalMin: sessions[0]?.totalMin || 0,
      articlesCompleted: readings,
      newWords: vocabs,
      wordsReviewed: reviews,
    });
  } catch (err) { next(err); }
});

// ===== 学习目标 =====

// 设置目标
router.post('/goal', [
  body('type').isIn(['daily', 'weekly', 'monthly']),
  body('target').isInt({ min: 1 }),
  body('metric').isIn(['minutes', 'words', 'articles']),
  validate,
], async (req, res, next) => {
  try {
    const { type, target, metric } = req.body;
    const now = new Date();

    let startDate, endDate;
    if (type === 'daily') {
      startDate = new Date(now); startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 1);
    } else if (type === 'weekly') {
      startDate = new Date(now); startDate.setDate(startDate.getDate() - startDate.getDay() + 1); startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 7);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    // 停用同类型旧目标
    await StudyGoal.updateMany({ userId: req.user._id, type, status: 'active' }, { status: 'failed' });

    const goal = await StudyGoal.create({
      userId: req.user._id, type, target, metric, startDate, endDate,
    });

    res.status(201).json({ goal });
  } catch (err) { next(err); }
});

// 获取当前目标
router.get('/goal', async (req, res, next) => {
  try {
    const goals = await StudyGoal.find({
      userId: req.user._id,
      status: 'active',
    }).sort({ createdAt: -1 });

    res.json({ goals });
  } catch (err) { next(err); }
});

// ===== 打卡 =====

// 获取打卡状态
router.get('/checkin', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [todayChecked, history, streak] = await Promise.all([
      hasCheckedIn(userId),
      getCheckInHistory(userId, 42),
      getStreak(userId),
    ]);

    // 构建最近 42 天日历
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const historySet = new Set(history.map(r => r.date));
    const calendar = [];
    for (let i = 41; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      calendar.push({
        date: dateStr,
        checked: historySet.has(dateStr),
        isToday: i === 0,
      });
    }

    // 本月打卡天数
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const monthChecked = history.filter(r => r.date >= monthStart).length;

    res.json({
      todayChecked,
      streak: streak.current,
      maxStreak: streak.max,
      monthChecked,
      calendar,
    });
  } catch (err) { next(err); }
});

// 执行打卡
router.post('/checkin', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { type = 'study' } = req.body; // 'reading' | 'vocab' | 'study'

    const already = await hasCheckedIn(userId);
    if (already) {
      return res.json({ success: true, alreadyChecked: true, message: '今日已打卡' });
    }

    const result = await tryCheckIn(userId, { type, count: 1, minutes: 5 });

    if (result.qualified) {
      const streak = await getStreak(userId);
      res.json({ success: true, qualified: true, streak: streak.current, message: '打卡成功' });
    } else {
      res.json({ success: true, qualified: false, message: '活动已记录，尚未满足打卡条件' });
    }
  } catch (err) { next(err); }
});

// ===== 文章统计 =====

// 获取文章阅读统计
router.get('/article-stats', async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 按难度分组统计
    const byDifficulty = await ReadingProgress.aggregate([
      { $match: { userId } },
      { $lookup: { from: 'articles', localField: 'articleId', foreignField: '_id', as: 'article' } },
      { $unwind: '$article' },
      { $group: {
        _id: '$article.difficulty',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        avgScore: { $avg: '$exerciseScore' },
      }},
      { $sort: { _id: 1 } },
    ]);

    // 按分类分组统计
    const byCategory = await ReadingProgress.aggregate([
      { $match: { userId } },
      { $lookup: { from: 'articles', localField: 'articleId', foreignField: '_id', as: 'article' } },
      { $unwind: '$article' },
      { $group: {
        _id: '$article.category',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } },
    ]);

    // 总体统计
    const [totalReading, completedReading, inProgress] = await Promise.all([
      ReadingProgress.countDocuments({ userId }),
      ReadingProgress.countDocuments({ userId, status: 'completed' }),
      ReadingProgress.countDocuments({ userId, status: 'reading' }),
    ]);

    // 最近完成的文章
    const recentCompleted = await ReadingProgress.find({ userId, status: 'completed' })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('articleId', 'title difficulty category wordCount')
      .select('articleId exerciseScore updatedAt durationSec');

    res.json({
      total: totalReading,
      completed: completedReading,
      inProgress,
      byDifficulty: byDifficulty.map(d => ({
        level: d._id,
        total: d.total,
        completed: d.completed,
        avgScore: d.avgScore ? Math.round(d.avgScore) : null,
      })),
      byCategory: byCategory.map(c => ({
        category: c._id,
        total: c.total,
        completed: c.completed,
      })),
      recentCompleted: recentCompleted.map(r => ({
        article: r.articleId,
        score: r.exerciseScore,
        completedAt: r.updatedAt,
        durationSec: r.durationSec,
      })),
    });
  } catch (err) { next(err); }
});

module.exports = router;
