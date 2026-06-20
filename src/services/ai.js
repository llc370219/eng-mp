const config = require('../config');

/**
 * AI 服务封装
 * 支持 OpenAI 和 Claude 两种 provider
 * Phase 4 再完善具体实现
 */

// 生成文章摘要
async function summarize(text, lang = 'both') {
  // TODO: Phase 4 实现
  return {
    summaryZh: '',
    summaryEn: '',
    error: 'AI 功能尚未实现',
  };
}

// 翻译
async function translate(text, targetLang = 'zh') {
  // TODO: Phase 4 实现
  return {
    translation: '',
    error: 'AI 功能尚未实现',
  };
}

// 生成练习题
async function generateQuiz(articleContent, count = 5) {
  // TODO: Phase 4 实现
  return {
    questions: [],
    error: 'AI 功能尚未实现',
  };
}

// 单词深度解析
async function analyzeWord(word) {
  // TODO: Phase 4 实现
  return {
    root: '',
    affixes: '',
    synonyms: [],
    collocations: [],
    error: 'AI 功能尚未实现',
  };
}

// 语法讲解
async function grammarExplain(topic) {
  // TODO: Phase 4 实现
  return {
    explanation: '',
    examples: [],
    error: 'AI 功能尚未实现',
  };
}

module.exports = {
  summarize,
  translate,
  generateQuiz,
  analyzeWord,
  grammarExplain,
};
