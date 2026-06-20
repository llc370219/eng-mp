const mongoose = require('mongoose');

const studyGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true,
  },
  target: { type: Number, required: true }, // 目标值（分钟/单词数/文章数）
  metric: {
    type: String,
    enum: ['minutes', 'words', 'articles'],
    required: true,
  },
  current: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed'],
    default: 'active',
  },
}, { timestamps: true });

studyGoalSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('StudyGoal', studyGoalSchema);
