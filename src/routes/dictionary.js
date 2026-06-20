const { Router } = require('express');
const { lookupWord } = require('../services/dictionary');

const router = Router();

// 查词
router.get('/:word', async (req, res, next) => {
  try {
    const result = await lookupWord(req.params.word);
    if (!result) {
      return res.status(404).json({ error: '未找到该单词' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
