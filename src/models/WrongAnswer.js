const mongoose = require('mongoose');

const wrongAnswerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // 来源：文章练习 或 语法练习
  sourceType: {
    type: String,
    enum: ['article', 'grammar'],
    required: true,
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'sourceType === "article" ? "Article" : "Grammar"',
  },
  questionIndex: { type: Number, required: true },
  questionText: { type: String, required: true },
  yourAnswer: { type: String, required: true },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, default: '' },
  // 复习状态
  reviewCount: { type: Number, default: 0 },
  lastReview: { type: Date, default: null },
  mastered: { type: Boolean, default: false }, // 连续答对 2 次视为掌握
}, { timestamps: true });

wrongAnswerSchema.index({ userId: 1, mastered: 1, createdAt: -1 });
wrongAnswerSchema.index({ userId: 1, sourceType: 1, sourceId: 1 });

module.exports = mongoose.model('WrongAnswer', wrongAnswerSchema);
