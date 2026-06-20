/**
 * SM-2 间隔重复算法
 *
 * 评分标准 (0-5):
 *   0 - 完全不记得
 *   1 - 错误，但看到答案后有印象
 *   2 - 错误，但看到答案后觉得很容易
 *   3 - 正确，但很费力
 *   4 - 正确，经过思考后回忆起来
 *   5 - 正确，毫不费力
 */

const MIN_EASE_FACTOR = 1.3;

/**
 * 根据用户评分计算下次复习参数
 * @param {Object} vocab - 当前 vocab 文档
 * @param {number} quality - 用户评分 0-5
 * @returns {Object} { interval, repetition, easeFactor, nextReview }
 */
function calculateNextReview(vocab, quality) {
  let { interval, repetition, easeFactor } = vocab;

  if (quality < 0 || quality > 5) {
    throw new Error('评分必须在 0-5 之间');
  }

  if (quality < 3) {
    // 评分 < 3：重置，从头开始
    repetition = 0;
    interval = 1;
  } else {
    // 评分 >= 3：正确
    repetition += 1;

    if (repetition === 1) {
      interval = 1;
    } else if (repetition === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    // 更新 easeFactor
    easeFactor = Math.max(
      MIN_EASE_FACTOR,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return { interval, repetition, easeFactor, nextReview };
}

module.exports = { calculateNextReview };
