const Dictionary = require('../models/Dictionary');
const config = require('../config');

const DICT_API = 'https://dictionary-api-7hmy.onrender.com/define';

/**
 * 查询单词释义
 * 优先查内置词典，无结果时调用第三方 API
 */
async function lookupWord(word) {
  const lowerWord = word.toLowerCase().trim();

  // 1. 查内置词典
  const local = await Dictionary.findOne({ word: lowerWord });
  if (local) {
    return formatLocalResult(local);
  }

  // 2. 调用第三方简明词典 API
  const external = await fetchFromDictAPI(lowerWord);
  if (external) {
    cacheToDB(lowerWord, external).catch(() => {});
    return external;
  }

  return null;
}

// 从内置词典格式化返回
function formatLocalResult(doc) {
  return {
    word: doc.word,
    phonetic: doc.phonetic || '',
    translation: doc.translation || '',
    definitionEn: doc.definitionEn || '',
    partOfSpeech: doc.partOfSpeech || '',
    collins: doc.collins,
    examples: doc.examples || [],
    tag: doc.tag,
    source: 'local',
  };
}

// 调用第三方简明词典 API
async function fetchFromDictAPI(word) {
  try {
    const res = await fetch(`${DICT_API}?word=${encodeURIComponent(word)}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.definition) return null;

    return {
      word: data.word || word,
      phonetic: '',
      partOfSpeech: data.partOfSpeech || '',
      translation: '',
      definitionEn: data.definition || '',
      examples: [],
      source: 'dictionary-api',
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
          partOfSpeech: data.partOfSpeech || '',
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
