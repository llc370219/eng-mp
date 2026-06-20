const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple-choice', 'fill-blank', 'true-false', 'short-answer'],
    required: true,
  },
  text: { type: String, required: true },
  options: [String],
  answer: { type: String, required: true },
  explanation: { type: String, default: '' },
}, { _id: false });

const exerciseSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true,
    index: true,
  },
  questions: [questionSchema],
}, { timestamps: true });

module.exports = mongoose.model('Exercise', exerciseSchema);
