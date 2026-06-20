const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['reading', 'vocab', 'grammar', 'exercise'],
    required: true,
  },
  itemId: { type: mongoose.Schema.Types.ObjectId, default: null },
  title: { type: String, default: '' },
  durationSec: { type: Number, default: 0 },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const studySessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null },
  durationMin: { type: Number, default: 0 },
  activities: [activitySchema],
}, { timestamps: true });

studySessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
