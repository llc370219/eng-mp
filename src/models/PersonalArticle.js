const mongoose = require('mongoose');

const sentenceTranslationSchema = new mongoose.Schema({
  en: { type: String, required: true },
  zh: { type: String, default: '' },
}, { _id: false });

const grammarPointSchema = new mongoose.Schema({
  title: { type: String, required: true },
  explanation: { type: String, default: '' },
  example: { type: String, default: '' },
}, { _id: false });

const highlightedVocabSchema = new mongoose.Schema({
  word: { type: String, required: true },
  definition: { type: String, default: '' },
  phonetic: { type: String, default: '' },
}, { _id: false });

const questionSchema = new mongoose.Schema({
  type: { type: String, enum: ['multiple-choice', 'true-false', 'fill-blank', 'short-answer'], required: true },
  text: { type: String, required: true },
  options: [String],
  answer: { type: String, required: true },
  explanation: { type: String, default: '' },
}, { _id: false });

const personalArticleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  summaryZh: { type: String, default: '' },
  difficulty: {
    type: String,
    enum: ['初中', '高中', 'CET4', 'CET6', '考研', '雅思'],
    required: true,
  },
  category: {
    type: String,
    enum: ['tech', 'life', 'news', 'literature', 'science', 'business'],
    default: 'life',
  },
  tags: [{ type: String, trim: true }],
  wordCount: { type: Number, default: 0 },
  readingTimeMin: { type: Number, default: 0 },
  highlightedVocab: [highlightedVocabSchema],
  sentenceTranslations: [sentenceTranslationSchema],
  grammarPoints: [grammarPointSchema],
  questions: [questionSchema],
  source: { type: String, default: 'ai' },
  prompt: { type: String, default: '' },
  isCompleted: { type: Boolean, default: false },
  exerciseScore: { type: Number, default: null },
}, { timestamps: true });

personalArticleSchema.index({ userId: 1, createdAt: -1 });
personalArticleSchema.index({ userId: 1, difficulty: 1 });

module.exports = mongoose.model('PersonalArticle', personalArticleSchema);
