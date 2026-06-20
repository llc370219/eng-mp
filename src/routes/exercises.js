const { Router } = require('express');
const Exercise = require('../models/Exercise');
const ReadingLog = require('../models/ReadingLog');
const auth = require('../middlewares/auth');

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

// 提交答案
router.post('/exercises/:id/submit', auth, async (req, res, next) => {
  try {
    const { answers } = req.body; // [用户答案]
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ error: '练习不存在' });
    }

    let correct = 0;
    const results = exercise.questions.map((q, i) => {
      const isCorrect = answers[i] === q.answer;
      if (isCorrect) correct++;
      return {
        question: q.text,
        yourAnswer: answers[i],
        correctAnswer: q.answer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const score = Math.round((correct / exercise.questions.length) * 100);

    // 记录成绩到阅读日志
    await ReadingLog.findOneAndUpdate(
      { userId: req.user._id, articleId: exercise.articleId },
      { exerciseScore: score },
      { sort: { createdAt: -1 } }
    );

    res.json({ score, correct, total: exercise.questions.length, results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
