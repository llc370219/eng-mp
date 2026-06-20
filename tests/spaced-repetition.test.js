const { calculateNextReview } = require('../src/services/spaced-repetition');

describe('SM-2 间隔重复算法', () => {
  const baseVocab = {
    interval: 0,
    repetition: 0,
    easeFactor: 2.5,
  };

  test('评分 < 3 应重置间隔', () => {
    const result = calculateNextReview({ ...baseVocab, interval: 10, repetition: 5 }, 2);
    expect(result.repetition).toBe(0);
    expect(result.interval).toBe(1);
  });

  test('评分 = 3 首次应设置 interval = 1', () => {
    const result = calculateNextReview(baseVocab, 3);
    expect(result.repetition).toBe(1);
    expect(result.interval).toBe(1);
  });

  test('评分 = 4 第二次应设置 interval = 6', () => {
    const result = calculateNextReview({ ...baseVocab, repetition: 1 }, 4);
    expect(result.repetition).toBe(2);
    expect(result.interval).toBe(6);
  });

  test('评分 = 5 第三次应按 easeFactor 计算', () => {
    const result = calculateNextReview({ ...baseVocab, repetition: 2, interval: 6 }, 5);
    expect(result.repetition).toBe(3);
    expect(result.interval).toBeGreaterThan(6);
  });

  test('easeFactor 不应低于 1.3', () => {
    const result = calculateNextReview({ ...baseVocab, easeFactor: 1.3 }, 3);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  test('评分 5 应提高 easeFactor', () => {
    const result = calculateNextReview(baseVocab, 5);
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });

  test('评分 3 应降低 easeFactor', () => {
    const result = calculateNextReview(baseVocab, 3);
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  test('nextReview 应在未来日期', () => {
    const result = calculateNextReview(baseVocab, 4);
    expect(result.nextReview).toBeInstanceOf(Date);
    expect(result.nextReview.getTime()).toBeGreaterThan(Date.now());
  });

  test('评分超出范围应抛出错误', () => {
    expect(() => calculateNextReview(baseVocab, -1)).toThrow();
    expect(() => calculateNextReview(baseVocab, 6)).toThrow();
  });
});
