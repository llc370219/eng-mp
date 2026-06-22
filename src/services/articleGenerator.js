/**
 * 鲜榨工坊 · 文章生成编排层（框架）
 *
 * generate() 是统一入口：
 *   - 已配置 AI Key → 调 aiService.generateArticle（真实生成，提示词见 services/ai.js）
 *   - 未配置 AI Key → 走 mockArticle（测试样例：模板正文 + 彩云真实翻译），保证「生成→入私享→阅读」整条链路可测
 *
 * 用户后续只需在 .env / Railway 配好 AI_PROVIDER + 对应 *_API_KEY，即自动切换为真实生成，无需改代码。
 *
 * 无论真实还是测试，返回结构都包含阅读所需全部内容：
 *   title, content, summaryZh, difficulty, category, tags, wordCount, readingTimeMin,
 *   highlightedVocab[{word,definition,phonetic}], sentenceTranslations[{en,zh}],
 *   grammarPoints[{title,explanation,example}], questions[{type,text,options,answer,explanation}]
 */
const config = require('../config');
const aiService = require('./ai');
const caiyun = require('./caiyun');

// 是否配好了「当前生效的」AI 提供商且开启了生成功能（DB 优先，与 chat() 用同一份配置，避免不一致）
async function aiConfigured() {
  try {
    const SystemSetting = require('../models/SystemSetting');
    const enabled = await SystemSetting.get('enableAIGeneration');
    if (enabled === false) return false; // 后台关闭了 AI 生成

    const cfg = await aiService.getAIConfig();
    return !!(cfg.keys[cfg.provider]);
  } catch {
    return !!(config.ai.keys[config.ai.provider]);
  }
}

async function generate(prompt, level = '高中', options = {}) {
  if (await aiConfigured()) {
    const r = await aiService.generateArticle(prompt, level, options);
    if (!r.error) return { ...r, mode: 'ai' };
    // 真实生成失败（如额度/网络）→ 退回测试样例，保证可用
    return { ...(await mockArticle(prompt, level, options)), mode: 'mock', aiError: r.error };
  }
  return { ...(await mockArticle(prompt, level, options)), mode: 'mock' };
}

// ===== 测试样例：模板正文 + 彩云真实翻译 =====
async function mockArticle(prompt, level = '高中', options = {}) {
  const topic = (prompt || '').trim() || 'a short story';
  const cat = options.category || 'life';
  const vd = (options.vocabDetails || []).filter(v => v && v.word).slice(0, 5);
  const vocabWords = vd.map(v => v.word);

  const p1 = [
    `This is a sample reading article about ${topic}.`,
    `It was generated in test mode so you can check that every reading feature works.`,
    `Each sentence below comes with its own Chinese translation.`,
  ];
  const p2 = vocabWords.length ? [
    `You can click on any word to look up its meaning in the dictionary.`,
    `Some words from your vocabulary book appear here, such as ${vocabWords.join(', ')}.`,
    `Double-click this paragraph to read the full translation.`,
  ] : [
    `You can click on any word to look up its meaning in the dictionary.`,
    `Important words are highlighted so that you can review them later.`,
    `Double-click this paragraph to read the full translation.`,
  ];
  const p3 = [
    `When a real AI service is connected, this workshop will write complete articles for you.`,
    `For now, this short text confirms that generating, saving and reading all work together.`,
  ];
  const paragraphs = [p1, p2, p3];
  const allSentences = paragraphs.reduce((acc, p) => acc.concat(p), []);
  const content = paragraphs.map(p => p.join(' ')).join('\n\n');

  // 用彩云把每句翻成中文（真实译文，保证阅读卡片有内容）
  const zhArr = await caiyun.translate(allSentences, 'en2zh');
  const sentenceTranslations = allSentences.map((en, i) => ({ en, zh: zhArr[i] || '' }));

  let summaryZh = await caiyun.translateOne(`A sample article about ${topic} for testing the reading features.`, 'en2zh');
  if (!summaryZh) summaryZh = `关于「${topic}」的测试样例文章（配置 AI Key 后将自动生成真实内容）。`;

  const highlightedVocab = vd.map(v => ({ word: v.word, definition: v.definition || '', phonetic: v.phonetic || '' }));

  const grammarPoints = [
    { title: '一般现在时', explanation: '用 is/are 或动词原形描述事实与习惯，例如 This is a sample。', example: p1[0] },
    { title: '情态动词 can', explanation: 'can + 动词原形表示「能够、可以」，例如 You can click…。', example: p2[0] },
  ];

  const questions = [
    { type: 'multiple-choice', text: 'What is the main purpose of this article?', options: ['To test the reading features', 'To book a hotel', 'To sell a product', 'To report the weather'], answer: 'To test the reading features', explanation: '文中说明这是用于测试阅读功能的样例。' },
    { type: 'true-false', text: 'Every sentence in this article has a Chinese translation.', options: ['True', 'False'], answer: 'True', explanation: '每句都配了中文翻译。' },
  ];

  const wordCount = content.split(/\s+/).filter(w => /[a-zA-Z]/.test(w)).length;
  return {
    title: `Test Article · ${topic.slice(0, 40)}`,
    content,
    summaryZh,
    difficulty: level,
    category: cat,
    tags: ['test', 'sample', cat],
    wordCount,
    readingTimeMin: Math.max(1, Math.ceil(wordCount / 200)),
    highlightedVocab,
    sentenceTranslations,
    grammarPoints,
    questions,
  };
}

module.exports = { generate, aiConfigured, mockArticle };
