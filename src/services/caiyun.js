/**
 * 彩云小译 LingoCloud API
 * 文档：https://docs.caiyunapp.com/lingocloud-api/
 * - 词典：POST /v1/dict  → 音标/中文释义/同义词/例句
 * - 翻译：POST /v1/translator → 批量文本翻译
 * Token 通过 header `X-Authorization: token <TOKEN>` 传递。
 */
const config = require('../config');

const DICT_URL = 'https://api.interpreter.caiyunai.com/v1/dict';
const TRANS_URL = 'https://api.interpreter.caiyunai.com/v1/translator';

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Authorization': 'token ' + (config.caiyun.token || ''),
  };
}

function enabled() {
  return !!config.caiyun.token;
}

/**
 * 查词 → { word, phonetic, explanations:[], synonym:[], antonym:[], examples:[{en,zh}] }
 */
async function dict(word) {
  if (!enabled()) return null;
  try {
    const res = await fetch(DICT_URL, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ source: String(word).toLowerCase().trim(), trans_type: 'en2zh', request_id: 'eng-mp' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const d = data && data.dictionary;
    if (!d || !d.explanations || !d.explanations.length) return null;
    const prons = d.prons || {};
    const phonetic = prons['en-us'] || prons.en || '';
    const examples = (d.wqx_example || [])
      .filter(e => Array.isArray(e) && e[0])
      .map(e => ({ en: e[0], zh: e[1] || '' }));
    return {
      word: d.entry || word,
      phonetic,
      explanations: d.explanations || [],
      synonym: d.synonym || [],
      antonym: d.antonym || [],
      examples,
    };
  } catch (err) {
    return null;
  }
}

/**
 * 批量翻译 → 返回与 texts 等长的译文数组（失败的项为 ''）
 * @param {string[]} texts
 * @param {string} transType 'en2zh' | 'zh2en' | 'auto2zh'
 */
async function translate(texts, transType = 'en2zh') {
  if (!enabled()) return texts.map(() => '');
  const source = Array.isArray(texts) ? texts : [texts];
  try {
    const res = await fetch(TRANS_URL, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ source, trans_type: transType, request_id: 'eng-mp', detect: true }),
    });
    if (!res.ok) return source.map(() => '');
    const data = await res.json();
    if (Array.isArray(data.target)) return data.target;
    if (typeof data.target === 'string') return [data.target];
    return source.map(() => '');
  } catch (err) {
    return source.map(() => '');
  }
}

// 单条翻译便捷方法
async function translateOne(text, transType = 'en2zh') {
  const arr = await translate([text], transType);
  return arr[0] || '';
}

module.exports = { dict, translate, translateOne, enabled };
