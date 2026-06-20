const { Router } = require('express');
const Grammar = require('../models/Grammar');
const WrongAnswer = require('../models/WrongAnswer');
const { body, query } = require('express-validator');
const validate = require('../middlewares/validator');
const auth = require('../middlewares/auth');

const router = Router();

// 语法列表
router.get('/', [
  query('level').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  query('category').optional().isIn(['tense', 'clause', 'voice', 'mood', 'agreement', 'punctuation', 'other']),
  validate,
  async (req, res, next) => {
    try {
      const { level, category } = req.query;
      const filter = {};
      if (level) filter.level = level;
      if (category) filter.category = category;

      const grammars = await Grammar.find(filter).sort({ level: 1, category: 1 });
      res.json({ grammars });
    } catch (err) {
      next(err);
    }
  },
]);

// 语法详情
router.get('/:id', async (req, res, next) => {
  try {
    const grammar = await Grammar.findById(req.params.id).populate('relatedGrammar', 'title level category');
    if (!grammar) {
      return res.status(404).json({ error: '语法点不存在' });
    }
    res.json({ grammar });
  } catch (err) {
    next(err);
  }
});

// 提交语法练习答案
router.post('/:id/exercises/submit', auth, [
  body('answers').isArray().withMessage('答案必须是数组'),
  validate,
  async (req, res, next) => {
    try {
      const grammar = await Grammar.findById(req.params.id);
      if (!grammar) {
        return res.status(404).json({ error: '语法点不存在' });
      }

      const { answers } = req.body;
      let correct = 0;
      const results = [];

      for (let i = 0; i < grammar.exercises.length; i++) {
        const q = grammar.exercises[i];
        const userAnswer = answers[i] || '';
        const isCorrect = userAnswer === q.answer;
        if (isCorrect) correct++;

        results.push({
          question: q.text,
          yourAnswer: userAnswer,
          correctAnswer: q.answer,
          isCorrect,
          explanation: q.explanation,
        });

        // 记录错题
        if (!isCorrect) {
          await WrongAnswer.findOneAndUpdate(
            {
              userId: req.user._id,
              sourceType: 'Grammar',
              sourceId: grammar._id,
              questionIndex: i,
            },
            {
              questionText: q.text,
              yourAnswer: userAnswer,
              correctAnswer: q.answer,
              explanation: q.explanation,
            },
            { upsert: true }
          );
        }
      }

      const score = Math.round((correct / grammar.exercises.length) * 100);
      res.json({ score, correct, total: grammar.exercises.length, results });
    } catch (err) {
      next(err);
    }
  },
]);

module.exports = router;
