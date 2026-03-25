const express = require('express');
const {
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
  resetPassword,
  checkDoctorEmail
} = require('../controllers/authController');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');

// ✅ Deprecated: Old /register route removed
// Use /register/send-otp → /register/verify-otp for OTP-based registration (required by strict flow)
// Or use /google-register for Google OAuth registration

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
router.get('/check-doctor-email', checkDoctorEmail);

module.exports = router;
