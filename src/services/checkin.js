const CheckIn = require('../models/CheckIn');

/**
 * 打卡规则：
 * - 完成 1 篇文章阅读（状态改为 completed）
 * - 或复习 5 个单词
 * - 或学习时长累计 5 分钟
 *
 * 满足任一条件即自动打卡
 */

const CHECK_IN_DATE = () => new Date().toISOString().slice(0, 10);

// 检查今天是否已打卡
async function hasCheckedIn(userId) {
  const today = CHECK_IN_DATE();
  const record = await CheckIn.findOne({ userId, date: today });
  return !!record;
}

// 尝试打卡（自动检测是否满足条件）
async function tryCheckIn(userId, activity) {
  const today = CHECK_IN_DATE();

  // 查找今天的记录
  let record = await CheckIn.findOne({ userId, date: today });

  if (!record) {
    record = new CheckIn({
      userId,
      date: today,
      studyMin: 0,
      articlesRead: 0,
      wordsReviewed: 0,
      activities: [],
    });
  }

  // 更新活动数据
  if (activity.type === 'reading') {
    record.articlesRead += 1;
    if (!record.activities.includes('reading')) record.activities.push('reading');
  } else if (activity.type === 'vocab') {
    record.wordsReviewed += activity.count || 1;
    if (!record.activities.includes('vocab')) record.activities.push('vocab');
  } else if (activity.type === 'study') {
    record.studyMin += activity.minutes || 0;
    if (!record.activities.includes('study')) record.activities.push('study');
  }

  await record.save();

  // 检查是否满足打卡条件
  const qualified = checkQualified(record);
  return { record, qualified };
}

// 判断是否满足打卡条件
function checkQualified(record) {
  return (
    record.articlesRead >= 1 ||      // 完成1篇文章
    record.wordsReviewed >= 5 ||     // 复习5个单词
    record.studyMin >= 5             // 学习5分钟
  );
}

// 获取用户打卡历史（最近N天）
async function getCheckInHistory(userId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  return CheckIn.find({ userId, date: { $gte: sinceStr } }).sort({ date: -1 });
}

// 计算连续打卡天数
async function getStreak(userId) {
  const records = await CheckIn.find({ userId }).sort({ date: -1 }).select('date');
  if (!records.length) return { current: 0, max: 0 };

  const dates = records.map(r => r.date);

  // 当前连续天数
  let current = 0;
  const today = CHECK_IN_DATE();
  let checkDate = new Date(today);

  for (const dateStr of dates) {
    const diff = Math.round((checkDate - new Date(dateStr + 'T00:00:00')) / 86400000);
    if (diff === 0 || (current === 0 && diff === 1)) {
      current++;
      checkDate = new Date(new Date(dateStr + 'T00:00:00'));
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (diff > 1) {
      break;
    }
  }

  // 最长连续天数
  let max = 1, temp = 1;
  const sorted = [...dates].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const curr = new Date(sorted[i] + 'T00:00:00');
    if ((curr - prev) === 86400000) {
      temp++;
      max = Math.max(max, temp);
    } else {
      temp = 1;
    }
  }

  return { current, max };
}

module.exports = { hasCheckedIn, tryCheckIn, checkQualified, getCheckInHistory, getStreak };
