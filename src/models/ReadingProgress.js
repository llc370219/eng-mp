const mongoose = require('mongoose');

const exerciseResultSchema = new mongoose.Schema({
  question: String,
  options: [String],
  userAnswer: String,
  correctAnswer: String,
  isCorrect: Boolean,
  explanation: String,
}, { _id: false });

const readingProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true,
  },
  status: {
    type: String,
    enum: ['reading', 'completed', 'abandoned'],
    default: 'reading',
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null },
  durationSec: { type: Number, default: 0 },
  wordCount: { type: Number, default: 0 },
  exerciseScore: { type: Number, default: null },
  exerciseResults: [exerciseResultSchema],
  lastPosition: { type: Number, default: 0 }, // 滚动位置
}, { timestamps: true });

readingProgressSchema.index({ userId: 1, articleId: 1 }, { unique: true });
readingProgressSchema.index({ userId: 1, status: 1 });
readingProgressSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ReadingProgress', readingProgressSchema);
