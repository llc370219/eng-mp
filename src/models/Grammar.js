const mongoose = require('mongoose');

const grammarExampleSchema = new mongoose.Schema({
  sentence: { type: String, required: true },
  translation: { type: String, default: '' },
  highlight: { type: String, default: '' },
}, { _id: false });

const grammarExerciseSchema = new mongoose.Schema({
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

const grammarSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  level: {
    type: String,
    enum: ['初中', '高中', 'CET4', 'CET6', '雅思'],
    required: true,
  },
  category: {
    type: String,
    enum: ['tense', 'clause', 'voice', 'mood', 'agreement', 'punctuation', 'other'],
    required: true,
  },
  explanation: { type: String, required: true },
  examples: [grammarExampleSchema],
  exercises: [grammarExerciseSchema],
  relatedGrammar: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grammar',
  }],
}, { timestamps: true });

grammarSchema.index({ level: 1, category: 1 });

module.exports = mongoose.model('Grammar', grammarSchema);
