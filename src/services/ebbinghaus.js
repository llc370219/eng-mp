/**
 * 艾宾浩斯遗忘曲线 — 生词复习计划
 *
 * 经典记忆曲线节点：5分钟 → 30分钟 → 12小时 → 1天 → 2天 → 4天 → 7天 → 15天 → 30天 →（掌握后）60天
 * 用「成功复习次数」(stage) 作为曲线上的位置：
 *   - 记得 → 前进一档（间隔拉长）
 *   - 简单 → 前进两档（跳过一档）
 *   - 困难 → 后退一档（更早再复习）
 *   - 忘了 → 回到曲线起点（清零，5 分钟后重学）
 */

// 每个 stage（=已成功复习次数）对应「到下一次复习」的间隔，单位：分钟
const STEPS_MIN = [
  5,            // 1 次 → 5 分钟
  30,           // 2 次 → 30 分钟
  12 * 60,      // 3 次 → 12 小时
  1 * 1440,     // 4 次 → 1 天
  2 * 1440,     // 5 次 → 2 天
  4 * 1440,     // 6 次 → 4 天
  7 * 1440,     // 7 次 → 7 天
  15 * 1440,    // 8 次 → 15 天
  30 * 1440,    // 9 次 → 30 天
];
const MASTERED_STAGE = STEPS_MIN.length + 1; // 10：视为已掌握
const MASTERED_MIN = 60 * 1440;              // 已掌握后仍每 60 天巩固一次

// 由 stage 得到「到下一次复习」的分钟数
function intervalForStage(stage) {
  if (stage <= 0) return 5;                       // 刚清零/新词，5 分钟后再来
  if (stage >= MASTERED_STAGE) return MASTERED_MIN;
  return STEPS_MIN[stage - 1];
}

// 由 stage 得到掌握等级（对应 VocabProgress.masteryLevel 枚举）
function masteryForStage(stage) {
  if (stage <= 0) return 'new';
  if (stage >= MASTERED_STAGE) return 'mastered';
  if (stage >= 7) return 'review';
  return 'learning';
}

/**
 * 根据本次评分计算下一次复习计划
 * @param {{repetition?:number}} progress 当前进度（repetition = 当前 stage）
 * @param {number} quality 评分：1 忘了 / 3 困难 / 4 记得 / 5 简单
 * @returns {{stage:number, intervalMinutes:number, nextReview:Date, masteryLevel:string}}
 */
function schedule(progress, quality) {
  let stage = progress && progress.repetition ? progress.repetition : 0;
  if (quality <= 2) stage = 0;                       // 忘了
  else if (quality === 3) stage = Math.max(0, stage - 1); // 困难
  else if (quality === 4) stage = stage + 1;         // 记得
  else stage = stage + 2;                            // 简单
  stage = Math.min(stage, MASTERED_STAGE);

  const intervalMinutes = intervalForStage(stage);
  const nextReview = new Date(Date.now() + intervalMinutes * 60000);
  return { stage, intervalMinutes, nextReview, masteryLevel: masteryForStage(stage) };
}

// 把分钟数转成人类可读的「下次复习」文案
function humanize(minutes) {
  if (minutes >= MASTERED_MIN) return '已掌握';
  if (minutes < 60) return `${Math.round(minutes)} 分钟后`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} 小时后`;
  return `${Math.round(minutes / 1440)} 天后`;
}

// 给定当前 stage，预览四个按钮分别会把下次复习排到多久后（供前端按钮提示）
function preview(stage) {
  const cur = stage || 0;
  const stageOf = (q) => {
    if (q <= 2) return 0;
    if (q === 3) return Math.max(0, cur - 1);
    if (q === 4) return Math.min(cur + 1, MASTERED_STAGE);
    return Math.min(cur + 2, MASTERED_STAGE);
  };
  return {
    again: humanize(intervalForStage(stageOf(1))),
    hard: humanize(intervalForStage(stageOf(3))),
    good: humanize(intervalForStage(stageOf(4))),
    easy: humanize(intervalForStage(stageOf(5))),
  };
}

module.exports = { schedule, humanize, preview, intervalForStage, masteryForStage, STEPS_MIN, MASTERED_STAGE };
