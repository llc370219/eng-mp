const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  provider: { type: String, required: true },
  model: { type: String, default: '' },
  function: { type: String, required: true },
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
  success: { type: Boolean, default: true },
  errorMessage: { type: String, default: '' },
}, { timestamps: true });

aiLogSchema.index({ userId: 1, createdAt: -1 });
aiLogSchema.index({ provider: 1, createdAt: -1 });

module.exports = mongoose.model('AILog', aiLogSchema);
