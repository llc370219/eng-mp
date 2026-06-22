const Dictionary = require('../models/Dictionary');
const config = require('../config');

const DICT_API = 'https://dictionary-api-7hmy.onrender.com/define';

/**
 * 查询单词释义
 * 仅查询内置词典
 */
async function lookupWord(word) {
  const lowerWord = word.toLowerCase().trim();

  // 查内置词典
  const local = await Dictionary.findOne({ word: lowerWord });
  if (local) {
    return formatLocalResult(local);
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

module.exports = { lookupWord };
