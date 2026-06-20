const { Router } = require('express');
const articleController = require('../controllers/articleController');
const auth = require('../middlewares/auth');
const optionalAuth = require('../middlewares/optionalAuth');

const router = Router();

router.get('/', optionalAuth, articleController.list);
router.get('/daily', optionalAuth, articleController.daily);
router.get('/search', optionalAuth, articleController.search);
router.get('/:id', optionalAuth, articleController.detail);

router.post('/', auth, articleController.create);
router.put('/:id', auth, articleController.update);
router.delete('/:id', auth, articleController.remove);

module.exports = router;
