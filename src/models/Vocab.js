const mongoose = require('mongoose');

const vocabSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  word: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  definition: { type: String, default: '' },
  phonetic: { type: String, default: '' },
  example: { type: String, default: '' },
  context: { type: String, default: '' },
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    default: null,
  },
  // SM-2 间隔重复字段
  interval: { type: Number, default: 0 },
  repetition: { type: Number, default: 0 },
  easeFactor: { type: Number, default: 2.5 },
  nextReview: { type: Date, default: Date.now },
  lastReview: { type: Date, default: null },
}, { timestamps: true });

// 同一用户不能重复添加同一个单词
vocabSchema.index({ userId: 1, word: 1 }, { unique: true });
vocabSchema.index({ userId: 1, nextReview: 1 });

module.exports = mongoose.model('Vocab', vocabSchema);
