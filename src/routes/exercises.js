const { Router } = require('express');
const { body, query } = require('express-validator');
const Exercise = require('../models/Exercise');
const Article = require('../models/Article');
const ReadingLog = require('../models/ReadingLog');
const WrongAnswer = require('../models/WrongAnswer');
const ai = require('../services/ai');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validator');

const router = Router();

// 获取文章配套题目
router.get('/articles/:articleId/exercises', async (req, res, next) => {
  try {
    const exercise = await Exercise.findOne({ articleId: req.params.articleId });
    if (!exercise) {
      return res.status(404).json({ error: '暂无练习题' });
    }
    res.json({ exercise });
  } catch (err) {
    next(err);
  }
});

// 提交文章练习答案
router.post('/exercises/:id/submit', auth, [
  body('answers').isArray().withMessage('答案必须是数组'),
  validate,
], async (req, res, next) => {
  try {
    const { answers } = req.body;
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ error: '练习不存在' });
    }

    let correct = 0;
    const results = [];

    for (let i = 0; i < exercise.questions.length; i++) {
      const q = exercise.questions[i];
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
      if (!isCorrect && req.user) {
        await WrongAnswer.findOneAndUpdate(
          {
            userId: req.user._id,
            sourceType: 'article',
            sourceId: exercise.articleId,
            questionIndex: i,
          },
          {
            questionText: q.text,
            yourAnswer: userAnswer,
            correctAnswer: q.answer,
            explanation: q.explanation,
            $inc: { reviewCount: 0 },
          },
          { upsert: true }
        );
      }
    }

    const score = Math.round((correct / exercise.questions.length) * 100);

    // 记录成绩到阅读日志
    if (exercise.articleId) {
      await ReadingLog.findOneAndUpdate(
        { userId: req.user._id, articleId: exercise.articleId },
        { exerciseScore: score },
        { sort: { createdAt: -1 } }
      );
    }

    res.json({ score, correct, total: exercise.questions.length, results });
  } catch (err) {
    next(err);
  }
});

// ===== 错题本 =====

// 错题列表
router.get('/wrong-answers', auth, async (req, res, next) => {
  try {
    const { sourceType, mastered, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user._id };

    if (sourceType) filter.sourceType = sourceType;
    if (mastered !== undefined) filter.mastered = mastered === 'true';

    const [wrongAnswers, total] = await Promise.all([
      WrongAnswer.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      WrongAnswer.countDocuments(filter),
    ]);

    res.json({ wrongAnswers, total });
  } catch (err) {
    next(err);
  }
});

// 复习错题（重答）
router.post('/wrong-answers/:id/review', auth, [
  body('answer').notEmpty().withMessage('请提供答案'),
  validate,
], async (req, res, next) => {
  try {
    const wrongAnswer = await WrongAnswer.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!wrongAnswer) {
      return res.status(404).json({ error: '错题不存在' });
    }

    const isCorrect = req.body.answer === wrongAnswer.correctAnswer;

    if (isCorrect) {
      wrongAnswer.reviewCount += 1;
      wrongAnswer.lastReview = new Date();
      // 连续答对 2 次视为掌握
      if (wrongAnswer.reviewCount >= 2) {
        wrongAnswer.mastered = true;
      }
      await wrongAnswer.save();
    } else {
      // 答错重置
      wrongAnswer.reviewCount = 0;
      wrongAnswer.lastReview = new Date();
      wrongAnswer.mastered = false;
      await wrongAnswer.save();
    }

    res.json({
      isCorrect,
      correctAnswer: wrongAnswer.correctAnswer,
      explanation: wrongAnswer.explanation,
      mastered: wrongAnswer.mastered,
    });
  } catch (err) {
    next(err);
  }
});

// 删除错题
router.delete('/wrong-answers/:id', auth, async (req, res, next) => {
  try {
    const result = await WrongAnswer.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!result) {
      return res.status(404).json({ error: '错题不存在' });
    }
    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
});

// ===== AI 生成练习 =====

// 为文章生成练习题（AI）
router.post('/articles/:articleId/exercises/generate', auth, async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.articleId);
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const count = req.body.count || 5;
    const result = await ai.generateQuiz(article.content, count);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    // 保存到数据库
    const exercise = await Exercise.findOneAndUpdate(
      { articleId: article._id },
      { questions: result.questions },
      { upsert: true, new: true }
    );

    res.json({ exercise });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
