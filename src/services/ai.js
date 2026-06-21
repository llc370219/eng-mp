const config = require('../config');
const SystemSetting = require('../models/SystemSetting');

// ===== Provider 注册表 =====
// 大部分国产模型使用 OpenAI 兼容格式
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    sdk: 'openai',
  },
  claude: {
    name: 'Claude',
    defaultModel: 'claude-sonnet-4-20250514',
    sdk: 'anthropic',
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    sdk: 'openai',
  },
  deepseekv4flash: {
    name: 'DeepSeek V4 Flash',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-v4-flash',
    sdk: 'openai',
  },
  mimo: {
    name: 'MiMo',
    baseURL: 'https://api.mimo.ai/v1',
    defaultModel: 'mimo-v2-pro',
    sdk: 'openai',
  },
  moonshot: {
    name: 'Moonshot (Kimi)',
    baseURL: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    sdk: 'openai',
  },
  zhipu: {
    name: '智谱 (GLM)',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    sdk: 'openai',
  },
  qwen: {
    name: '通义千问',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo',
    sdk: 'openai',
  },
};

// 客户端缓存：{ providerName: { client, apiKey } }
const clients = {};

// 从数据库读取 AI 配置，DB 值优先，.env 作为 fallback
async function getAIConfig() {
  const providerNames = Object.keys(PROVIDERS);
  const allKeys = ['aiProvider', 'aiModel', 'aiMaxTokens', ...providerNames.map(n => `aiApiKey_${n}`)];

  // 一次性读取所有配置项
  const values = await Promise.all(allKeys.map(k => SystemSetting.get(k)));
  const settings = {};
  allKeys.forEach((k, i) => { settings[k] = values[i]; });

  const provider = settings.aiProvider || config.ai.provider;
  const model = settings.aiModel || config.ai.model || '';
  const maxTokens = settings.aiMaxTokens || config.ai.maxTokens;

  // 读取各 provider 的 API key（DB 优先，.env fallback）
  const keys = {};
  for (const name of providerNames) {
    const dbKey = settings[`aiApiKey_${name}`];
    keys[name] = dbKey || config.ai.keys[name] || '';
  }

  return { provider, model, maxTokens, keys };
}

// 获取 OpenAI 兼容客户端（支持动态 key，key 变化时自动重建）
function getOpenAIClient(providerName, apiKey) {
  const cached = clients[providerName];
  if (cached && cached.apiKey === apiKey) return cached.client;

  if (!apiKey) {
    throw new Error(`${PROVIDERS[providerName].name} API Key 未配置，请在系统设置中配置`);
  }

  const { OpenAI } = require('openai');
  const client = new OpenAI({
    apiKey,
    baseURL: PROVIDERS[providerName].baseURL,
  });

  clients[providerName] = { client, apiKey };
  return client;
}

// 获取 Anthropic 客户端（支持动态 key）
function getAnthropicClient(apiKey) {
  const cached = clients.claude;
  if (cached && cached.apiKey === apiKey) return cached.client;

  if (!apiKey) {
    throw new Error('Claude API Key 未配置，请在系统设置中配置');
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  clients.claude = { client, apiKey };
  return client;
}

// ===== 统一调用接口 =====
async function chat(systemPrompt, userPrompt, options = {}) {
  // 从 DB 读取配置（带 fallback 到 .env）
  const aiConfig = await getAIConfig();

  const providerName = options.provider || aiConfig.provider;
  const provider = PROVIDERS[providerName];

  if (!provider) {
    throw new Error(`不支持的 AI 提供商: ${providerName}。支持的提供商: ${Object.keys(PROVIDERS).join(', ')}`);
  }

  const model = options.model || aiConfig.model || provider.defaultModel;
  const maxTokens = options.maxTokens || aiConfig.maxTokens;
  const apiKey = aiConfig.keys[providerName];

  if (provider.sdk === 'anthropic') {
    // Claude API
    const client = getAnthropicClient(apiKey);
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    return response.content[0].text;
  } else {
    // OpenAI 兼容 API（DeepSeek, MiMo, Moonshot, 智谱, 千问等）
    const client = getOpenAIClient(providerName, apiKey);
    const response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    return response.choices[0].message.content;
  }
}

// ===== AI 功能 =====

/**
 * 生成文章摘要
 */
async function summarize(text, lang = 'both', options = {}) {
  const langHint = lang === 'zh' ? '只输出中文摘要'
    : lang === 'en' ? 'Only output English summary'
    : '输出中文摘要和英文摘要';

  const systemPrompt = `你是一个英语阅读助手。请为以下英文文章生成摘要。
${langHint}。
摘要应当简洁准确，中文摘要 100 字以内，英文摘要 50 words 以内。
返回 JSON 格式：{"summaryZh": "...", "summaryEn": "..."}`;

  try {
    const result = await chat(systemPrompt, text, options);
    const parsed = JSON.parse(result);
    return { summaryZh: parsed.summaryZh || '', summaryEn: parsed.summaryEn || '' };
  } catch (err) {
    return { summaryZh: '', summaryEn: '', error: err.message };
  }
}

/**
 * 翻译
 */
async function translate(text, targetLang = 'zh', options = {}) {
  const target = targetLang === 'zh' ? '中文' : targetLang === 'ja' ? '日文' : '英文';

  const systemPrompt = `你是一个专业翻译。请将以下文本翻译成${target}。
保持原文的语气和风格。只输出翻译结果，不要解释。`;

  try {
    const translation = await chat(systemPrompt, text, options);
    return { translation };
  } catch (err) {
    return { translation: '', error: err.message };
  }
}

/**
 * 生成阅读理解题
 */
async function generateQuiz(articleContent, count = 5, options = {}) {
  const systemPrompt = `你是一个英语教学专家。请根据以下英文文章生成 ${count} 道阅读理解题。

题型要求：
- 至少 2 道选择题（4 个选项）
- 至少 1 道判断题（True/False）
- 至少 1 道填空题
- 可以有简答题

每道题包含：type（multiple-choice/true-false/fill-blank/short-answer）、text（题目）、options（选项数组，判断题和填空题可省略）、answer（正确答案）、explanation（中文解析）

返回 JSON 格式：{"questions": [...]}`;

  try {
    const result = await chat(systemPrompt, articleContent, options);
    const parsed = JSON.parse(result);
    return { questions: parsed.questions || [] };
  } catch (err) {
    return { questions: [], error: err.message };
  }
}

/**
 * 单词深度解析
 */
async function analyzeWord(word, options = {}) {
  const systemPrompt = `你是一个英语词汇专家。请对以下单词进行深度解析。

包含：
1. 词根词缀分析
2. 同义词和反义词（各 3-5 个）
3. 常见搭配（3-5 个）
4. 易混淆词辨析
5. 记忆技巧

返回 JSON 格式：
{
  "root": "词根分析",
  "affixes": "词缀分析",
  "synonyms": ["同义词1", "同义词2"],
  "antonyms": ["反义词1", "反义词2"],
  "collocations": ["搭配1", "搭配2"],
  "confusedWith": ["易混淆词及区别"],
  "memoryTip": "记忆技巧"
}`;

  try {
    const result = await chat(systemPrompt, word, options);
    return JSON.parse(result);
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * 语法讲解
 */
async function grammarExplain(topic, options = {}) {
  const systemPrompt = `你是一个英语语法专家。请对以下语法主题进行详细讲解。

要求：
1. 用简洁的中文讲解语法规则
2. 给出 3-5 个典型例句（英文+中文翻译）
3. 指出常见错误
4. 提供记忆口诀或技巧

返回 JSON 格式：
{
  "explanation": "语法讲解（Markdown 格式）",
  "examples": [
    {"sentence": "英文例句", "translation": "中文翻译", "highlight": "重点部分"}
  ],
  "commonMistakes": ["常见错误1", "常见错误2"],
  "memoryTip": "记忆技巧"
}`;

  try {
    const result = await chat(systemPrompt, topic, options);
    return JSON.parse(result);
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * AI 生成英语文章（增强版）
 * 根据用户生词本掌握程度智能选词，生成完整的文章及配套学习内容
 *
 * @param {string} prompt - 用户主题提示
 * @param {string} level - 难度等级 (初中/高中/CET4/CET6/考研/雅思)
 * @param {object} options - 配置项
 * @param {string[]} options.vocabWords - 生词本单词列表
 * @param {object[]} options.vocabDetails - 生词本详情 [{word, masteryLevel, definition, phonetic}]
 * @param {string} options.category - 文章分类
 * @param {number} options.minVocabCount - 最少使用生词数，默认 3
 * @param {string} options.extraRequirements - 用户额外要求
 * @param {string} options.provider - AI 提供商
 * @param {string} options.model - AI 模型
 */
async function generateArticle(prompt, level = '高中', options = {}) {
  const levelGuide = {
    '初中': { desc: '简单句为主（主谓宾），词汇量 ≤1000，时态限一般现在/过去/将来', words: '300-500' },
    '高中': { desc: '复合句（定语从句、状语从句），词汇量 ≤2500，常见时态+被动语态', words: '400-600' },
    'CET4': { desc: '较复杂句式，词汇量 ≤4500，可使用虚拟语气、倒装、强调句', words: '500-700' },
    'CET6': { desc: '高级句式+学术词汇，词汇量 ≤6000', words: '600-800' },
    '考研': { desc: '考研英语难度，长难句分析，学术词汇 ≤5500，逻辑严密的议论文/说明文', words: '500-800' },
    '雅思': { desc: '学术英语，复杂句式，高级词汇，接近 native 水平', words: '700-1000' },
  };

  const guide = levelGuide[level] || levelGuide['高中'];
  const category = options.category || 'life';
  const minVocab = options.minVocabCount || 3;

  // 按掌握程度分组生词
  const vocabMasteryMap = { new: [], learning: [], review: [], mastered: [] };
  if (options.vocabDetails && options.vocabDetails.length > 0) {
    options.vocabDetails.forEach(v => {
      const lvl = v.masteryLevel || 'new';
      if (vocabMasteryMap[lvl]) vocabMasteryMap[lvl].push(v.word);
    });
  }

  // 构建掌握详情文本
  const levelLabels = { new: '未学习', learning: '学习中', review: '复习中', mastered: '已掌握' };
  const masteryDetail = Object.entries(vocabMasteryMap)
    .filter(([, words]) => words.length > 0)
    .map(([lvl, words]) => `- ${lvl}（${levelLabels[lvl]}）: ${words.join(', ')}`)
    .join('\n');

  const vocabListStr = (options.vocabWords || []).join(', ');

  const systemPrompt = `你是一个专业的英语教学专家和文章创作者。你的任务是根据用户提供的信息，生成一篇高质量的英语阅读文章及完整的配套学习内容。

## 核心原则
1. 难度精准 — 严格遵守指定等级的词汇量、句式复杂度、语法范围
2. 生词融合 — 将用户生词本中的单词自然融入文章，不生硬堆砌
3. 内容优质 — 文章要有教育意义、趣味性、贴近生活或有知识价值
4. 输出规范 — 严格返回指定 JSON 格式，不包含任何多余文字

## 难度要求（${level}）
${guide.desc}。目标词数：${guide.words} 词。

## 分类可选值
tech（科技）、life（生活）、news（新闻）、literature（文学）、science（科学）、business（商业）

## 题型可选值
multiple-choice（选择题4选1）、true-false（判断题）、fill-blank（填空题）、short-answer（简答题）

返回严格的 JSON 格式（不要包含任何其他文字，不要用 \`\`\`json 包裹）：
{
  "title": "英文标题（5-15个单词，简洁有吸引力）",
  "content": "英文正文（段落间用 \\n\\n 分隔）",
  "summaryZh": "中文摘要（50字以内）",
  "category": "从6个分类中选最匹配的一个",
  "tags": ["英文标签1", "英文标签2", "英文标签3"],
  "highlightedVocab": [
    {"word": "单词原形", "definition": "中文释义", "phonetic": "/国际音标/"}
  ],
  "sentenceTranslations": [
    {"en": "英文句子（与正文逐句完全一致）", "zh": "中文翻译"}
  ],
  "grammarPoints": [
    {"title": "语法点名称（中文）", "explanation": "简要讲解（中文100字以内）", "example": "文中例句（英文原文）"}
  ],
  "questions": [
    {
      "type": "multiple-choice",
      "text": "英文题目",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "正确选项的完整文本",
      "explanation": "中文解析"
    }
  ]
}

## 要求
1. tags: 3-5 个英文标签，与主题相关
2. highlightedVocab: 5-10 个重点词汇，优先从用户生词本选取，附音标和中文释义
3. sentenceTranslations: 必须覆盖文章所有句子，en 与正文句子完全一致
4. grammarPoints: 2-3 个文中实际出现的语法点
5. questions: 3-5 道题，至少 2 道选择题 + 1 道判断题，answer 必须正确
6. 所有内容英文，解析和翻译用中文`;

  const userPrompt = `请为我生成一篇英语阅读文章：

## 基本要求
- **难度等级:** ${level}
- **主题方向:** ${prompt}
- **分类:** ${category}

${vocabListStr ? `## 我的生词本\n以下是我正在学习的单词，请尽量在文章中自然使用这些词（至少使用 ${minVocab} 个）：\n${vocabListStr}` : ''}

${masteryDetail ? `## 生词本掌握情况\n${masteryDetail}\n\n使用策略：new 和 learning 的词优先使用放在显眼位置，review 的词适度使用，mastered 的词少用。` : ''}

${options.extraRequirements ? `## 额外要求\n${options.extraRequirements}` : ''}`;

  try {
    const result = await chat(systemPrompt, userPrompt, { ...options, maxTokens: 8192 });
    let jsonStr = result;
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    const wordCount = (parsed.content || '').split(/\s+/).filter(w => /[a-zA-Z]/.test(w)).length;
    const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

    return {
      title: parsed.title || '',
      content: parsed.content || '',
      summaryZh: parsed.summaryZh || '',
      difficulty: level,
      category: parsed.category || category,
      tags: parsed.tags || [],
      wordCount,
      readingTimeMin,
      highlightedVocab: parsed.highlightedVocab || [],
      sentenceTranslations: parsed.sentenceTranslations || [],
      grammarPoints: parsed.grammarPoints || [],
      questions: parsed.questions || [],
    };
  } catch (err) {
    return { error: err.message };
  }
}

// 导出
module.exports = {
  chat,
  summarize,
  translate,
  generateQuiz,
  analyzeWord,
  grammarExplain,
  generateArticle,
  getAIConfig,
  PROVIDERS,
};
