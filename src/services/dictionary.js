const Dictionary = require('../models/Dictionary');
const config = require('../config');

/**
 * 查询单词释义
 * 优先查内置词典，无结果时调用外部 API
 */
async function lookupWord(word) {
  const lowerWord = word.toLowerCase().trim();

  // 1. 查内置词典
  const local = await Dictionary.findOne({ word: lowerWord });
  if (local) {
    return formatLocalResult(local);
  }

  // 2. 调用外部 API
  const external = await fetchFromExternalAPI(lowerWord);
  if (external) {
    // 缓存到内置词典（异步，不阻塞返回）
    cacheToDB(lowerWord, external).catch(() => {});
    return external;
  }

  return null;
}

// 从内置词典格式化返回
function formatLocalResult(doc) {
  return {
    word: doc.word,
    phonetic: doc.phonetic,
    translation: doc.translation,
    definitionEn: doc.definitionEn,
    collins: doc.collins,
    examples: doc.examples,
    tag: doc.tag,
    exchange: doc.exchange,
    source: 'local',
  };
}

// 调用 Free Dictionary API
async function fetchFromExternalAPI(word) {
  try {
    const url = `${config.dictApiUrl}/${encodeURIComponent(word)}`;
    const res = await fetch(url);

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    const phonetic = entry.phonetics?.find((p) => p.text)?.text || '';
    const audio = entry.phonetics?.find((p) => p.audio)?.audio || '';

    // 提取释义
    const definitions = [];
    const examples = [];

    for (const meaning of entry.meanings || []) {
      for (const def of meaning.definitions || []) {
        definitions.push(`(${meaning.partOfSpeech}) ${def.definition}`);
        if (def.example) {
          examples.push(def.example);
        }
      }
    }

    return {
      word: entry.word,
      phonetic,
      audio,
      translation: '', // 外部 API 无中文释义
      definitionEn: definitions.slice(0, 5).join('\n'),
      examples: examples.slice(0, 3),
      source: 'external',
    };
  } catch {
    return null;
  }
}

// 缓存外部 API 结果到数据库
async function cacheToDB(word, data) {
  try {
    await Dictionary.updateOne(
      { word },
      {
        $setOnInsert: {
          word,
          phonetic: data.phonetic || '',
          translation: data.translation || '',
          definitionEn: data.definitionEn || '',
          examples: data.examples || [],
        },
      },
      { upsert: true }
    );
  } catch {
    // 缓存失败不影响主流程
  }
}

module.exports = { lookupWord };
