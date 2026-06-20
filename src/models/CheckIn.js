const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true,
  },
  studyMin: { type: Number, default: 0 },
  articlesRead: { type: Number, default: 0 },
  wordsReviewed: { type: Number, default: 0 },
  activities: [String],
}, { timestamps: true });

checkInSchema.index({ userId: 1, date: 1 }, { unique: true });
checkInSchema.index({ date: 1 });

module.exports = mongoose.model('CheckIn', checkInSchema);
