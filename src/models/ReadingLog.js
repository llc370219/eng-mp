const mongoose = require('mongoose');

const readingLogSchema = new mongoose.Schema({
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
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null },
  durationSec: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0, min: 0, max: 100 },
  exerciseScore: { type: Number, default: null },
}, { timestamps: true });

readingLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ReadingLog', readingLogSchema);
