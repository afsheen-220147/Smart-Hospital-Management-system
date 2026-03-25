const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const AdminDoctor = require('../models/AdminDoctor');
const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const validatePassword = require('../utils/validatePassword');
const sendEmail = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// In-memory OTP store for registration (production: use Redis)
const registrationOtps = new Map();
// Rate limiting: track last OTP send time per email
const otpRateLimit = new Map();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RATE_LIMIT_MS = 60 * 1000;  // 1 minute between OTP requests

// Helper: generate 4-digit OTP
const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

// Helper: send registration OTP email
const sendRegistrationOtpEmail = async (email, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="color: #2563eb; text-align: center;">MediCare+ Hospital</h2>
      <p style="text-align: center; color: #374151;">Your registration verification OTP is:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1d4ed8; background: #eff6ff; padding: 12px 24px; border-radius: 8px;">${otp}</span>
      </div>
      <p style="text-align: center; color: #6b7280; font-size: 14px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
    </div>
  `;
  await sendEmail({ to: email, subject: 'MediCare+ Registration Verification OTP', html });
};

// Helper: create profile record for patient or doctor
const createProfileRecord = async (user, department) => {
  if (user.role === 'patient') {
    await Patient.create({ user: user._id, gender: 'Male', bloodGroup: 'O+' });
  } else if (user.role === 'doctor') {
    await Doctor.create({ user: user._id, specialization: department || 'General', experience: 0, fees: 0 });
  }
};

// @desc    Step 1: Send registration OTP
// @route   POST /api/v1/auth/register/send-otp
// @access  Public
exports.registerSendOtp = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword, role } = req.body;

  if (!name || !email || !password || !confirmPassword || !role) {
    res.status(400); throw new Error('All fields are required');
  }
  if (password !== confirmPassword) {
    res.status(400); throw new Error('Passwords do not match');
  }
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) {
    res.status(400); throw new Error(pwCheck.errors.join('. '));
  }
  if (!['patient', 'doctor'].includes(role)) {
    res.status(400); throw new Error('Invalid role selection');
  }

  const userExists = await User.findOne({ email: email.toLowerCase() });
  if (userExists) {
    res.status(400); throw new Error('Account already exists.');
  }

  // Doctor authorization
  if (role === 'doctor') {
    if (!email.toLowerCase().endsWith('@rguktn.ac.in')) {
      res.status(403); throw new Error('This email is not authorized to register as a doctor.');
    }
    const adminDoc = await AdminDoctor.findOne({ email: email.toLowerCase() });
    if (!adminDoc) {
      res.status(403); throw new Error('This email is not authorized to register as a doctor.');
    }
  }

  // Rate limit
  const lastSent = otpRateLimit.get(email.toLowerCase());
  if (lastSent && Date.now() - lastSent < OTP_RATE_LIMIT_MS) {
    res.status(429); throw new Error('Please wait at least 60 seconds before requesting another OTP.');
  }

  const otp = generateOtp();
  registrationOtps.set(email.toLowerCase(), {
    otp, name, email: email.toLowerCase(), password, role,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
  });
  otpRateLimit.set(email.toLowerCase(), Date.now());
  await sendRegistrationOtpEmail(email, otp);

  res.status(200).json({ success: true, message: 'OTP sent to your email.' });
});

// @desc    Step 2: Verify registration OTP and create account
// @route   POST /api/v1/auth/register/verify-otp
// @access  Public
exports.registerVerifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) { res.status(400); throw new Error('Email and OTP are required'); }

  const pending = registrationOtps.get(email.toLowerCase());
  if (!pending) { res.status(400); throw new Error('No pending registration found. Please start registration again.'); }
  if (Date.now() > pending.expiresAt) { registrationOtps.delete(email.toLowerCase()); res.status(400); throw new Error('OTP has expired. Please request a new one.'); }
  if (pending.otp !== otp) { res.status(400); throw new Error('Invalid OTP. Please try again.'); }

  const userExists = await User.findOne({ email: pending.email });
  if (userExists) { registrationOtps.delete(email.toLowerCase()); res.status(400); throw new Error('Account already exists.'); }

  let department = 'General';
  if (pending.role === 'doctor') {
    const adminDoc = await AdminDoctor.findOne({ email: pending.email });
    if (adminDoc) department = adminDoc.department;
  }

  const user = await User.create({
    name: pending.name,
    email: pending.email,
    password: pending.password,
    role: pending.role,
    authProvider: ['local'],
  });

  if (user) {
    await createProfileRecord(user, department);
    
    // ✅ FIX: Auto-approve doctor if they're in AdminDoctor list
    if (user.role === 'doctor') {
      const adminDoc = await AdminDoctor.findOne({ email: user.email });
      if (adminDoc) {
        const doctor = await Doctor.findOne({ user: user._id });
        if (doctor) {
          doctor.isApproved = true;
          doctor.approvalDate = new Date();
          await doctor.save();
        }
      }
    }
    
    registrationOtps.delete(email.toLowerCase());

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please sign in with your email and password.',
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Register user (legacy, now with password policy + doctor check)
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) { res.status(400); throw new Error(pwCheck.errors.join('. ')); }
  if (role === 'admin') { res.status(403); throw new Error('Administrator accounts cannot be self-registered.'); }

  const userExists = await User.findOne({ email });
  if (userExists) { res.status(400); throw new Error('Account already exists.'); }

  if (role === 'doctor') {
    if (!email.toLowerCase().endsWith('@rguktn.ac.in')) {
      res.status(403); throw new Error('This email is not authorized to register as a doctor.');
    }
    const adminDoc = await AdminDoctor.findOne({ email: email.toLowerCase() });
    if (!adminDoc) { res.status(403); throw new Error('This email is not authorized to register as a doctor.'); }
  }

  const user = await User.create({ name, email, password, role, authProvider: ['local'] });

  let department = 'General';
  if (role === 'doctor') {
    const adminDoc = await AdminDoctor.findOne({ email: email.toLowerCase() });
    if (adminDoc) department = adminDoc.department;
  }
  await createProfileRecord(user, department);
  
  // ✅ FIX: Auto-approve doctor if they're in AdminDoctor list
  if (user.role === 'doctor') {
    const adminDoc = await AdminDoctor.findOne({ email: user.email });
    if (adminDoc) {
      const doctor = await Doctor.findOne({ user: user._id });
      if (doctor) {
        doctor.isApproved = true;
        doctor.approvalDate = new Date();
        await doctor.save();
      }
    }
  }

  res.status(201).json({
    success: true, _id: user._id, name: user.name, email: user.email,
    role: user.role, token: generateToken(user._id),
  });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user) { res.status(401); throw new Error('Invalid email or password'); }
  if (!user.password) { res.status(401); throw new Error('This account was created with Google. Please use "Sign in with Google" button.'); }
  
  if (await user.matchPassword(password)) {
    // ✅ FIX: Doctor approval check - cannot login if not approved by admin
    if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: user._id });
      if (!doctor) {
        res.status(403);
        throw new Error('Doctor profile not found. Please complete your registration.');
      }
      if (!doctor.isApproved) {
        res.status(403);
        throw new Error('Your account is pending admin approval. You will receive an email once approved.');
      }
    }
    
    // ✅ FIX: Ensure patient has profile
    if (user.role === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (!patient) {
        res.status(403);
        throw new Error('Patient profile not found. Please complete your registration.');
      }
    }
    
    res.json({ success: true, _id: user._id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id) });
  } else { res.status(401); throw new Error('Invalid email or password'); }
});

// @desc    Logout user
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// @desc    Google OAuth login (existing users) or detect new user
// @route   POST /api/v1/auth/google
// @access  Public
exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, message: 'Google ID token is required' });

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        if (!user.authProvider.includes('google')) user.authProvider.push('google');
        await user.save();
      } else {
        return res.status(200).json({ success: true, needs_registration: true, email, name });
      }
    }

    res.status(200).json({
      success: true, _id: user._id, name: user.name, email: user.email,
      role: user.role, token: generateToken(user._id),
    });
  } catch (err) {
    console.error('Google Auth Error:', err.message);
    res.status(400).json({ success: false, message: `Google authentication failed: ${err.message}` });
  }
};

// @desc    Google OAuth login (auto-creates patient account if not exists)
// @route   POST /api/v1/auth/google-login
// @access  Public
exports.googleAuthLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Google ID token is required' });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Check if user exists by googleId or email
    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        // ✅ FIX: Doctor approval check when linking Google to existing account
        if (user.role === 'doctor') {
          const doctor = await Doctor.findOne({ user: user._id });
          if (!doctor || !doctor.isApproved) {
            return res.status(403).json({ 
              success: false, 
              message: 'Doctor account is pending approval. You cannot login with Google until approved by an admin.' 
            });
          }
        }
        
        // Link Google account to existing user
        user.googleId = googleId;
        if (!user.authProvider.includes('google')) user.authProvider.push('google');
        await user.save();
      } else {
        // ✅ FIX: Only auto-create PATIENT accounts via Google, NOT doctor
        // Doctor must register via email OTP flow
        if (email.toLowerCase().endsWith('@rguktn.ac.in')) {
          return res.status(403).json({ 
            success: false, 
            message: 'Doctor registration requires email verification. Please sign up with your email and password.' 
          });
        }
        
        // Auto-create new user as patient (no password required for Google-only accounts)
        user = await User.create({
          name,
          email,
          googleId,
          role: 'patient',
          authProvider: ['google'],
        });
        // Create patient profile
        await Patient.create({ user: user._id, gender: 'Not Specified', bloodGroup: 'Unknown' });
      }
    } else {
      // ✅ FIX: Doctor approval check on login
      if (user.role === 'doctor') {
        const doctor = await Doctor.findOne({ user: user._id });
        if (!doctor || !doctor.isApproved) {
          return res.status(403).json({ 
            success: false, 
            message: 'Your doctor account is pending admin approval. You will receive an email once approved.' 
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error('Google Login Error:', err.message);
    res.status(400).json({ success: false, message: `Google login failed: ${err.message}` });
  }
};

// @desc    Google OAuth register (new users with role + password + doctor check)
// @route   POST /api/v1/auth/google-register
// @access  Public
exports.googleRegister = async (req, res) => {
  try {
    const { idToken, role, password, confirmPassword } = req.body;
    if (!idToken || !role || !password) {
      return res.status(400).json({ success: false, message: 'Google token, role and password are required' });
    }
    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Administrator accounts cannot be self-registered.' });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return res.status(400).json({ success: false, message: pwCheck.errors.join('. ') });
    }
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid Google token. Please try again.' });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Doctor authorization
    if (role === 'doctor') {
      if (!email.toLowerCase().endsWith('@rguktn.ac.in')) {
        return res.status(403).json({ success: false, message: 'This email is not authorized to register as a doctor.' });
      }
      const adminDoc = await AdminDoctor.findOne({ email: email.toLowerCase() });
      if (!adminDoc) {
        return res.status(403).json({ success: false, message: 'This email is not authorized to register as a doctor.' });
      }
    }

    const existingUser = await User.findOne({ $or: [{ email }, { googleId }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this Google email already exists. Please login instead.' });
    }

    let department = 'General';
    if (role === 'doctor') {
      const adminDoc = await AdminDoctor.findOne({ email: email.toLowerCase() });
      if (adminDoc) department = adminDoc.department;
    }

    const user = await User.create({
      name, email, googleId, password,
      role: role || 'patient', authProvider: ['google', 'local'],
    });
    await createProfileRecord(user, department);

    // ✅ FIX: Auto-approve doctor if they're in AdminDoctor list
    if (user.role === 'doctor') {
      const adminDoc = await AdminDoctor.findOne({ email: user.email });
      if (adminDoc) {
        const doctor = await Doctor.findOne({ user: user._id });
        if (doctor) {
          doctor.isApproved = true;
          doctor.approvalDate = new Date();
          await doctor.save();
        }
      }
    }

    res.status(201).json({ success: true, message: 'Registration successful! Please login with your email and password.' });
  } catch (err) {
    console.error('GoogleRegister Error:', err.message);
    res.status(400).json({ success: false, message: `Registration failed: ${err.message}` });
  }
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({ success: true, _id: user._id, name: user.name, email: user.email, role: user.role });
  } else {
    res.status(404); throw new Error('User not found');
  }
});

// @desc    Forgot password - send 4-digit OTP
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    const userWithPwd = await User.findOne({ email }).select('+password');
    if (!userWithPwd.password) {
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In. Password reset is not available.' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.resetOtp = otp;
    user.resetOtpExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #2563eb; text-align: center;">MediCare+ Hospital</h2>
        <p style="text-align: center; color: #374151;">Your password reset OTP is:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1d4ed8; background: #eff6ff; padding: 12px 24px; border-radius: 8px;">${otp}</span>
        </div>
        <p style="text-align: center; color: #6b7280; font-size: 14px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    `;

    await sendEmail({ to: email, subject: 'MediCare+ Password Reset OTP', html });
    res.status(200).json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('ForgotPassword Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

// @desc    Verify OTP (forgot password)
// @route   POST /api/v1/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email }).select('+resetOtp +resetOtpExpire');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.resetOtp || !user.resetOtpExpire) {
      return res.status(400).json({ success: false, message: 'No OTP request found. Please request a new OTP.' });
    }
    if (Date.now() > user.resetOtpExpire) {
      user.resetOtp = undefined;
      user.resetOtpExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (user.resetOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    const resetToken = generateToken(user._id);
    user.resetOtp = undefined;
    user.resetOtpExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, message: 'OTP verified successfully', resetToken });
  } catch (err) {
    console.error('VerifyOtp Error:', err.message);
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
};

// @desc    Reset password (after OTP verification)
// @route   POST /api/v1/auth/reset-password
// @access  Public (requires resetToken)
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, password, confirmPassword } = req.body;
    if (!resetToken || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return res.status(400).json({ success: false, message: pwCheck.errors.join('. ') });
    }

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired reset token. Please start over.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = password;
    if (!user.authProvider.includes('local')) {
      user.authProvider.push('local');
    }
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful. You can now login.' });
  } catch (err) {
    console.error('ResetPassword Error:', err.message);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};

// @desc    Check if doctor email is pre-approved by admin
// @route   GET /api/v1/auth/check-doctor-email?email=xxx
// @access  Public
exports.checkDoctorEmail = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase();

  if (!normalizedEmail.endsWith('@rguktn.ac.in')) {
    return res.status(200).json({
      success: false,
      authorized: false,
      message: 'This email is not authorized to register as a doctor. Only @rguktn.ac.in institutional emails are allowed.',
    });
  }

  const adminDoc = await AdminDoctor.findOne({ email: normalizedEmail });
  if (!adminDoc) {
    return res.status(200).json({
      success: false,
      authorized: false,
      message: 'This email is not authorized to register as a doctor. Please contact the administrator.',
    });
  }

  return res.status(200).json({ success: true, authorized: true });
});
