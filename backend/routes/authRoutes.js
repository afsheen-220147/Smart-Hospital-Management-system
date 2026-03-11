const express = require('express');
const {
  register,
  registerSendOtp,
  registerVerifyOtp,
  login,
  logout,
  getMe,
  googleAuth,
  googleAuthLogin,
  googleRegister,
  forgotPassword,
  verifyOtp,
  resetPassword
} = require('../controllers/authController');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/register/send-otp', registerSendOtp);
router.post('/register/verify-otp', registerVerifyOtp);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/google-login', googleAuthLogin);
router.post('/google-register', googleRegister);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.get('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
