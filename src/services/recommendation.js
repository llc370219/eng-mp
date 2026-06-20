const Article = require('../models/Article');
const ReadingLog = require('../models/ReadingLog');

const LEVEL_ORDER = ['初中', '高中', 'CET4', 'CET6', '雅思'];

/**
 * 获取用户每日推荐文章
 *
 * 策略：
 * 1. 排除已读文章
 * 2. 根据用户水平 + 正确率动态调整难度范围
 * 3. 返回多篇推荐（默认 5 篇）
 */
async function getDailyRecommendations(userId, userLevel = '高中', limit = 5) {
  // 获取已读文章 ID
  const readLogs = await ReadingLog.find({ userId }).select('articleId').lean();
  const readIds = readLogs.map((log) => log.articleId);

  // 计算用户近期正确率
  const recentLogs = await ReadingLog.find({
    userId,
    exerciseScore: { $ne: null },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('exerciseScore')
    .lean();

  let difficultyAdjustment = 0;
  if (recentLogs.length >= 5) {
    const avgScore = recentLogs.reduce((sum, l) => sum + l.exerciseScore, 0) / recentLogs.length;
    if (avgScore >= 85) difficultyAdjustment = 1;      // 正确率高，提升难度
    else if (avgScore < 50) difficultyAdjustment = -1;  // 正确率低，降低难度
  }

  // 计算推荐难度范围
  const baseIndex = LEVEL_ORDER.indexOf(userLevel);
  const adjustedIndex = Math.max(0, Math.min(LEVEL_ORDER.length - 1, baseIndex + difficultyAdjustment));
  const targetLevel = LEVEL_ORDER[adjustedIndex];

  // 优先推荐目标难度，其次相邻难度
  const nearbyLevels = getNearbyLevels(targetLevel);

  // 查询未读文章
  const filter = {
    isPublished: true,
    _id: { $nin: readIds },
  };

  // 先尝试目标难度
  let articles = await Article.find({ ...filter, difficulty: targetLevel })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-content');

  // 不够则补充相邻难度
  if (articles.length < limit) {
    const remaining = limit - articles.length;
    const existingIds = articles.map((a) => a._id);
    const nearbyArticles = await Article.find({
      ...filter,
      _id: { $nin: [...readIds, ...existingIds] },
      difficulty: { $in: nearbyLevels, $ne: targetLevel },
    })
      .sort({ createdAt: -1 })
      .limit(remaining)
      .select('-content');

    articles = [...articles, ...nearbyArticles];
  }

  // 还不够就放宽到所有未读
  if (articles.length < limit) {
    const remaining = limit - articles.length;
    const existingIds = articles.map((a) => a._id);
    const anyArticles = await Article.find({
      ...filter,
      _id: { $nin: [...readIds, ...existingIds] },
    })
      .sort({ createdAt: -1 })
      .limit(remaining)
      .select('-content');

    articles = [...articles, ...anyArticles];
  }

  return {
    articles,
    targetLevel,
    difficultyAdjustment,
    reason: difficultyAdjustment === 1
      ? '近期正确率较高，推荐更高难度'
      : difficultyAdjustment === -1
        ? '近期正确率较低，推荐降低难度'
        : '根据当前水平推荐',
  };
}

function getNearbyLevels(level) {
  const idx = LEVEL_ORDER.indexOf(level);
  const start = Math.max(0, idx - 1);
  const end = Math.min(LEVEL_ORDER.length - 1, idx + 1);
  return LEVEL_ORDER.slice(start, end + 1);
}

module.exports = { getDailyRecommendations };
