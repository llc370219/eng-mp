const { Router } = require('express');
const vocabController = require('../controllers/vocabController');
const auth = require('../middlewares/auth');

const router = Router();

router.use(auth); // 所有词汇路由都需要认证

router.post('/', vocabController.add);
router.get('/', vocabController.list);
router.get('/review', vocabController.review);
router.post('/:id/review', vocabController.submitReview);
router.put('/:id', vocabController.update);
router.delete('/:id', vocabController.remove);

module.exports = router;
