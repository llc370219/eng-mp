/**
 * 阅读难度分析服务
 * 基于 Flesch-Kincaid Grade Level + 词频分析
 */

// 简单音节估算（英文）
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  let count = 0;
  const vowels = 'aeiouy';
  let prevVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }

  // 修正：以 e 结尾通常不发音
  if (word.endsWith('e') && count > 1) count--;
  // 修正：至少 1 个音节
  return Math.max(1, count);
}

/**
 * 分析文本难度
 * @param {string} text - 英文文本
 * @returns {Object} { wordCount, sentenceCount, syllableCount, fleschKincaidGrade, difficulty }
 */
function analyzeDifficulty(text) {
  // 清理文本
  const cleanText = text.replace(/\s+/g, ' ').trim();

  // 分句（按 . ! ? 分割）
  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  // 分词
  const words = cleanText.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  const wordCount = Math.max(1, words.length);

  // 统计音节
  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);

  // Flesch-Kincaid Grade Level
  const grade =
    0.39 * (wordCount / sentenceCount) +
    11.8 * (syllableCount / wordCount) -
    15.59;

  const roundedGrade = Math.round(grade * 10) / 10;

  // 映射到考试等级
  let difficulty;
  if (grade <= 3) difficulty = '初中';
  else if (grade <= 6) difficulty = '高中';
  else if (grade <= 9) difficulty = 'CET4';
  else if (grade <= 13) difficulty = 'CET6';
  else difficulty = '雅思';

  return {
    wordCount,
    sentenceCount,
    syllableCount,
    fleschKincaidGrade: roundedGrade,
    difficulty,
    readingTimeMin: Math.max(1, Math.ceil(wordCount / 200)), // 假设 200 词/分钟
  };
}

module.exports = { analyzeDifficulty, countSyllables };
