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
  tag: { type: String, default: '' },
  exchange: { type: String, default: '' },
}, { timestamps: true });

// word 字段已有 unique: true 自动创建索引，无需重复定义

module.exports = mongoose.model('Dictionary', dictionarySchema);
