const config = require('../config');

// 延迟初始化客户端
let openai = null;
let anthropic = null;

function getOpenAI() {
  if (!openai && config.ai.openaiKey) {
    const { OpenAI } = require('openai');
    openai = new OpenAI({ apiKey: config.ai.openaiKey });
  }
  return openai;
}

function getAnthropic() {
  if (!anthropic && config.ai.claudeKey) {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey: config.ai.claudeKey });
  }
  return anthropic;
}

// 统一调用接口
async function chat(systemPrompt, userPrompt, options = {}) {
  const provider = options.provider || config.ai.provider;

  if (provider === 'claude') {
    const client = getAnthropic();
    if (!client) throw new Error('Claude API key 未配置');

    const response = await client.messages.create({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    return response.content[0].text;
  } else {
    // 默认 OpenAI
    const client = getOpenAI();
    if (!client) throw new Error('OpenAI API key 未配置');

    const response = await client.chat.completions.create({
      model: options.model || 'gpt-4o-mini',
      max_tokens: options.maxTokens || 2048,
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
async function summarize(text, lang = 'both') {
  const langHint = lang === 'zh' ? '只输出中文摘要'
    : lang === 'en' ? 'Only output English summary'
    : '输出中文摘要和英文摘要';

  const systemPrompt = `你是一个英语阅读助手。请为以下英文文章生成摘要。
${langHint}。
摘要应当简洁准确，中文摘要 100 字以内，英文摘要 50 words 以内。
返回 JSON 格式：{"summaryZh": "...", "summaryEn": "..."}`;

  try {
    const result = await chat(systemPrompt, text);
    const parsed = JSON.parse(result);
    return { summaryZh: parsed.summaryZh || '', summaryEn: parsed.summaryEn || '' };
  } catch (err) {
    return { summaryZh: '', summaryEn: '', error: err.message };
  }
}

/**
 * 翻译
 */
async function translate(text, targetLang = 'zh') {
  const target = targetLang === 'zh' ? '中文' : targetLang === 'ja' ? '日文' : '英文';

  const systemPrompt = `你是一个专业翻译。请将以下文本翻译成${target}。
保持原文的语气和风格。只输出翻译结果，不要解释。`;

  try {
    const translation = await chat(systemPrompt, text);
    return { translation };
  } catch (err) {
    return { translation: '', error: err.message };
  }
}

/**
 * 生成阅读理解题
 */
async function generateQuiz(articleContent, count = 5) {
  const systemPrompt = `你是一个英语教学专家。请根据以下英文文章生成 ${count} 道阅读理解题。

题型要求：
- 至少 2 道选择题（4 个选项）
- 至少 1 道判断题（True/False）
- 至少 1 道填空题
- 可以有简答题

每道题包含：type（multiple-choice/true-false/fill-blank/short-answer）、text（题目）、options（选项数组，判断题和填空题可省略）、answer（正确答案）、explanation（中文解析）

返回 JSON 格式：{"questions": [...]}`;

  try {
    const result = await chat(systemPrompt, articleContent);
    const parsed = JSON.parse(result);
    return { questions: parsed.questions || [] };
  } catch (err) {
    return { questions: [], error: err.message };
  }
}

/**
 * 单词深度解析
 */
async function analyzeWord(word) {
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
    const result = await chat(systemPrompt, word);
    return JSON.parse(result);
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * 语法讲解
 */
async function grammarExplain(topic) {
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
    const result = await chat(systemPrompt, topic);
    return JSON.parse(result);
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = {
  summarize,
  translate,
  generateQuiz,
  analyzeWord,
  grammarExplain,
};
