const { Router } = require('express');
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

const router = Router();

router.use(auth); // 所有用户路由都需要认证

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.get('/stats', userController.getStats);
router.get('/history', userController.getHistory);
router.post('/reading-log', userController.addReadingLog);

module.exports = router;
