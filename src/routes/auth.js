const { Router } = require('express');
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');
const { generateCaptcha } = require('../utils/captcha');

const router = Router();

// 获取人机验证码
router.get('/captcha', (req, res) => {
  const captcha = generateCaptcha();
  res.json({ token: captcha.token, svg: captcha.svg });
});

router.post('/send-code', authController.sendCode);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/reset-password', authController.resetPassword);
router.post('/refresh', authController.refresh);
router.get('/login-history', auth, authController.loginHistory);

module.exports = router;
