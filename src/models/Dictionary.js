const mongoose = require('mongoose');

const dictionarySchema = new mongoose.Schema({
  word: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phonetic: { type: String, default: '' },
  translation: { type: String, default: '' },
  definitionEn: { type: String, default: '' },
  collins: { type: String, default: '' },
  examples: [String],
  // 缓存的例句
  exampleSentences: [{ en: String, zh: String, _id: false }],
  tag: { type: String, default: '' },
  exchange: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Dictionary', dictionarySchema);
