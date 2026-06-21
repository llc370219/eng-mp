const { analyzeDifficulty, countSyllables } = require('../src/services/difficulty-analyzer');

describe('音节计数', () => {
  test('简单单词', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('dog')).toBe(1);
    expect(countSyllables('the')).toBe(1);
  });

  test('多音节单词', () => {
    expect(countSyllables('hello')).toBe(2);
    expect(countSyllables('computer')).toBe(3);
    expect(countSyllables('university')).toBe(5);
  });

  test('以 e 结尾的单词', () => {
    expect(countSyllables('make')).toBe(1);
    expect(countSyllables('time')).toBe(1);
    expect(countSyllables('create')).toBe(1); // 简化算法：ce 结尾视为 1 音节
    expect(countSyllables('machine')).toBe(2);
  });
});

describe('难度分析', () => {
  test('简单文本应为低难度', () => {
    const text = 'I like cats. The cat is small. It is cute.';
    const result = analyzeDifficulty(text);
    expect(result.difficulty).toBe('初中');
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.sentenceCount).toBeGreaterThan(0);
  });

  test('复杂文本应为高难度', () => {
    const text = 'The unprecedented acceleration of technological sophistication has fundamentally transformed the paradigmatic framework within which contemporary socioeconomic institutions operate, necessitating a comprehensive reassessment of established methodologies.';
    const result = analyzeDifficulty(text);
    expect(['CET6', '考研', '雅思']).toContain(result.difficulty);
  });

  test('应返回正确的统计字段', () => {
    const text = 'Hello world. This is a test.';
    const result = analyzeDifficulty(text);
    expect(result).toHaveProperty('wordCount');
    expect(result).toHaveProperty('sentenceCount');
    expect(result).toHaveProperty('syllableCount');
    expect(result).toHaveProperty('fleschKincaidGrade');
    expect(result).toHaveProperty('difficulty');
    expect(result).toHaveProperty('readingTimeMin');
  });

  test('阅读时间应至少 1 分钟', () => {
    const text = 'Hi.';
    const result = analyzeDifficulty(text);
    expect(result.readingTimeMin).toBeGreaterThanOrEqual(1);
  });

  test('wordCount 应正确统计', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const result = analyzeDifficulty(text);
    expect(result.wordCount).toBe(9);
  });
});
