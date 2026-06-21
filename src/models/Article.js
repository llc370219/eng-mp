const mongoose = require('mongoose');

const highlightedVocabSchema = new mongoose.Schema({
  word: { type: String, required: true },
  definition: { type: String, default: '' },
  position: { type: Number, default: 0 },
}, { _id: false });

// 提前生成的逐句翻译（阅读卡片用，避免实时调用 AI）
const sentenceTranslationSchema = new mongoose.Schema({
  en: { type: String, required: true },
  zh: { type: String, default: '' },
}, { _id: false });

// 提前生成的逐段语法解析
const grammarPointSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  explanation: { type: String, default: '' },
  example: { type: String, default: '' },
}, { _id: false });

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  summaryZh: { type: String, default: '' },
  summaryEn: { type: String, default: '' },
  difficulty: {
    type: String,
    enum: ['初中', '高中', 'CET4', 'CET6', '考研', '雅思'],
    required: true,
  },
  category: {
    type: String,
    enum: ['tech', 'life', 'news', 'literature', 'science', 'business'],
    required: true,
  },
  tags: [{ type: String, trim: true }],
  wordCount: { type: Number, default: 0 },
  readingTimeMin: { type: Number, default: 0 },
  highlightedVocab: [highlightedVocabSchema],
  sentenceTranslations: [sentenceTranslationSchema],
  grammarPoints: [grammarPointSchema],
  source: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  isPublished: { type: Boolean, default: false },
}, { timestamps: true });

// 全文索引
articleSchema.index({ title: 'text', content: 'text', tags: 'text' });
articleSchema.index({ difficulty: 1, category: 1 });
articleSchema.index({ isPublished: 1, createdAt: -1 });

module.exports = mongoose.model('Article', articleSchema);
