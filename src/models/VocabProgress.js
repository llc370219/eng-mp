const mongoose = require('mongoose');

const vocabProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  word: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  definition: { type: String, default: '' },
  phonetic: { type: String, default: '' },
  // SM-2 算法字段
  interval: { type: Number, default: 0 },
  repetition: { type: Number, default: 0 },
  easeFactor: { type: Number, default: 2.5 },
  nextReview: { type: Date, default: Date.now },
  // 学习统计
  totalReviews: { type: Number, default: 0 },
  correctReviews: { type: Number, default: 0 },
  lastScore: { type: Number, default: null },
  masteryLevel: {
    type: String,
    enum: ['new', 'learning', 'review', 'mastered'],
    default: 'new',
  },
  // 来源
  source: {
    type: String,
    enum: ['article', 'dict', 'manual'],
    default: 'manual',
  },
  articleId: { type: mongoose.Schema.Types.ObjectId, default: null },
  lastReview: { type: Date, default: null },
}, { timestamps: true });

vocabProgressSchema.index({ userId: 1, word: 1 }, { unique: true });
vocabProgressSchema.index({ userId: 1, nextReview: 1 });
vocabProgressSchema.index({ userId: 1, masteryLevel: 1 });

module.exports = mongoose.model('VocabProgress', vocabProgressSchema);
