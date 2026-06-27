/**
 * 硅基流动（SiliconFlow）大语言模型词典服务
 * 文档：https://api-docs.siliconflow.cn/docs/api/chat-completions-post
 * 模型：tencent/Hunyuan-MT-7B（腾讯混元机器翻译模型，OpenAI 兼容 chat/completions 接口）
 *
 * 取代原「彩云小译词典 API」。由于 Hunyuan-MT-7B 是翻译模型、不稳定输出 JSON，
 * 这里采用「翻译式提示词 + 健壮文本解析」的方案，并提供整句上下文消歧以提升释义准确度。
 *
 * 对外返回结构与原 caiyun.dict 保持同形，便于在路由中直接替换：
 *   dict(word, context?) → { word, phonetic, explanations:[], examples:[{en,zh}], source }
 */
const config = require('../config');

const BASE_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const MODEL = 'tencent/Hunyuan-MT-7B';

function enabled() {
  return !!(config.siliconflow && config.siliconflow.apiKey);
}

// ===== 底层：单轮 chat 调用 =====
async function chat(messages, { maxTokens = 320, temperature = 0.2, timeoutMs = 20000 } = {}) {
  if (!enabled()) return '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + config.siliconflow.apiKey,
      },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature }),
      signal: controller.signal,
    });
    if (!res.ok) return '';
    const data = await res.json();
    const choice = data && data.choices && data.choices[0];
    return (choice && choice.message && choice.message.content) || '';
  } catch (err) {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

// ===== 文本解析工具 =====
const CJK = /[一-鿿]/;

// 从模型输出里抽取音标（取第一个被斜杠包裹的串，去掉斜杠）
function extractPhonetic(text) {
  const m = (text || '').match(/\/\s*([^/\n]{1,60}?)\s*\//);
  return m ? m[1].trim() : '';
}

// 把词条文本解析为「释义行数组」：保留含中文的词性/释义行，剔除音标行、例句行、近反义词行
function parseExplanations(text) {
  return (text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => CJK.test(l))                                   // 必须含中文
    .filter(l => !/\/[^/\n]{1,40}\//.test(l))                   // 剔除含音标 /.../ 的行（如「英 /.../ 美 /.../」）
    .filter(l => !/^(例句|翻译|整句|英文|原文)\s*[:：]/.test(l)) // 去掉例句/整句翻译行
    .filter(l => !/^(近义词|同义词|反义词|搭配|词组|短语|词源)\s*[:：]/.test(l))
    .map(l => l
      .replace(/^[-•*]\s*/, '')                                 // 去掉行首项目符号
      .replace(/^(中文释义|释义|含义|意思)\s*[:：]\s*/, '')      // 去掉「中文释义：」之类标签
      .trim())
    .filter(Boolean);
}

// ===== 词典：基础查询（无上下文，结果可缓存） =====
const BASE_DICT_SYS = `你是一部专业的英汉词典。请根据用户给出的英文单词，直接输出该词的词条，规则：
1. 第一行输出音标，用斜杠包裹，例如 /rɪˈzɪliənt/；
2. 之后每行输出一个义项，以词性缩写开头（n./v./vi./vt./adj./adv./prep./conj./pron./num. 等），后接简洁中文释义，多个近义释义用中文分号「；」分隔；
3. 只输出音标和释义，不要输出例句、近义词、反义词、词源或任何额外说明。`;

async function dict(word, context) {
  if (!enabled()) return null;
  const w = String(word || '').toLowerCase().trim();
  if (!w) return null;

  const raw = await chat(
    [
      { role: 'system', content: BASE_DICT_SYS },
      { role: 'user', content: w },
    ],
    { maxTokens: 280 }
  );

  const phonetic = extractPhonetic(raw);
  let explanations = parseExplanations(raw);
  let examples = [];

  // 整句上下文增强：消歧出语境义，并把原句+译文作为例句
  if (context && String(context).trim()) {
    const ctx = await contextualSense(w, String(context).trim());
    if (ctx) {
      if (ctx.meaning) explanations = [`【本句中】${ctx.meaning}`, ...explanations];
      if (ctx.example && ctx.example.en) examples = [ctx.example];
    }
  }

  if (!phonetic && !explanations.length) return null;
  return { word: w, phonetic, explanations, examples, source: 'llm' };
}

// ===== 整句上下文消歧：返回 { meaning, example:{en,zh} } =====
const CTX_SYS = `你是一部专业的英汉词典。用户会给出一个英文句子以及句中的一个目标单词。
请只输出该目标单词在这个句子语境中的释义，格式为「词性缩写 + 空格 + 中文释义」，例如「n. 河岸」。
释义要贴合该句语境、简洁，不要翻译整句，不要输出例句或其它内容。`;

async function contextualSense(word, sentence) {
  const raw = await chat(
    [
      { role: 'system', content: CTX_SYS },
      { role: 'user', content: `句子：${sentence}\n目标单词：${word}` },
    ],
    { maxTokens: 120 }
  );

  // 解析语境义：优先取「中文释义：」标签，否则取首个含中文的行
  let meaning = '';
  const lines = (raw || '').split('\n').map(l => l.trim()).filter(Boolean);
  const posLine = lines.find(l => /[一-鿿]/.test(l) && !/^例句|^句子|^目标/.test(l));
  if (posLine) {
    meaning = posLine
      .replace(/^(词性)\s*[:：]\s*/, '')
      .replace(/^(中文释义|释义)\s*[:：]\s*/, '')
      .trim();
    // 模型有时把「词性：n.」与「中文释义：河岸」拆成两行，做一次合并
    const cn = lines.find(l => /^(中文释义|释义)\s*[:：]/.test(l));
    const pos = lines.find(l => /^词性\s*[:：]/.test(l));
    if (cn && pos) {
      meaning = pos.replace(/^词性\s*[:：]\s*/, '').trim() + ' ' + cn.replace(/^(中文释义|释义)\s*[:：]\s*/, '').trim();
    }
  }

  // 整句翻译作为例句（翻译模型最稳的能力）
  const zh = await translateOne(sentence);
  const example = zh ? { en: sentence, zh } : null;

  if (!meaning && !example) return null;
  return { meaning, example };
}

// ===== 造例句：先让模型造句，再用翻译本职逐句译中文（输出格式不稳，做健壮解析） =====
const EXAMPLE_SYS = `你是英语例句库。用户给出一个英文单词，请直接输出 2 个使用该词的简单、地道的英文例句。
每行一句，不要编号、不要中文、不要同义改写、不要任何解释。`;

async function generateExamples(word, count = 2) {
  if (!enabled()) return [];
  const w = String(word || '').toLowerCase().trim();
  if (!w) return [];
  const key = w.slice(0, Math.min(4, w.length)); // 用词首字母匹配，兼容时态/单复数变形

  const raw = await chat(
    [
      { role: 'system', content: EXAMPLE_SYS },
      { role: 'user', content: w },
    ],
    { maxTokens: 220, temperature: 0.6 }
  );

  const seen = new Set();
  const sentences = (raw || '')
    .split('\n')
    .map(l => l.replace(/^[\s\d.)、:：>*\-•]+/, ''))             // 去掉行首编号/符号
    .map(l => { const i = l.search(CJK); return (i >= 0 ? l.slice(0, i) : l).trim(); }) // 切到首个中文前，丢弃模型多给的译文
    .map(l => l.replace(/^["“”']|["“”']$/g, '').trim())
    .filter(l => /[A-Za-z]/.test(l) && l.split(/\s+/).length >= 4) // 至少 4 个词，过滤标题/碎片
    .filter(l => l.toLowerCase().includes(key))                   // 必须包含目标词（变形宽松匹配）
    .filter(l => { const k = l.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, count);

  const out = [];
  for (const en of sentences) {
    out.push({ en, zh: await translateOne(en) });
  }
  return out;
}

// ===== 句子翻译（复用 Hunyuan-MT 的翻译本职能力） =====
async function translateOne(text) {
  if (!text) return '';
  const raw = await chat(
    [{ role: 'user', content: `把下面的英文翻译成中文，只输出译文，不要任何解释：\n\n${text}` }],
    { maxTokens: 256 }
  );
  return (raw || '').trim();
}

module.exports = { dict, contextualSense, generateExamples, translateOne, enabled };
