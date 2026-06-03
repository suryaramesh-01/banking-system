const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Account = require('../models/Account');
const Notification = require('../models/Notification');
const { sendTokens } = require('../utils/token');
const { sendEmail } = require('../utils/email');
const { protect } = require('../middleware/auth');

// ── POST /api/v1/auth/register ──
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password, dob, accountType } = req.body;
    if (!name || !email || !phone || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, phone, password, dob, role: 'user', status: 'active' });

    // Create bank account
    const accountNumber = await Account.generateAccountNumber();
    const account = await Account.create({
      user: user._id,
      accountNumber,
      accountType: accountType || 'Savings',
      balance: 0,
      ifsc: 'NEXA' + Math.floor(1000000 + Math.random() * 9000000),
      branch: 'Main Branch',
    });

    // Welcome notification
    await Notification.create({
      user: user._id,
      type: 'system',
      title: 'Welcome to NexaBank!',
      message: `Your ${account.accountType} account (${accountNumber}) has been created successfully.`,
      icon: '🎉',
    });

    // Welcome email (non-blocking)
    sendEmail({ to: email, type: 'welcome', data: [name, accountNumber] });

    sendTokens(user, 201, res);
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/login ──
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (user.status === 'blocked')
      return res.status(403).json({ success: false, message: 'Account blocked. Contact support.' });

    const match = await user.matchPassword(password);
    if (!match) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        user.status = 'blocked';
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Reset login attempts on success
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await Notification.create({
      user: user._id, type: 'login',
      title: 'New Login Detected',
      message: `Successful login on ${new Date().toLocaleString('en-IN')}`,
      icon: '🔐',
    });

    sendTokens(user, 200, res);
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/forgot-password ──
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'Email not registered' });

    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    await sendEmail({ to: email, type: 'otp', data: [user.name, otp] });

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/verify-otp ──
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.verifyOTP(otp))
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    res.json({ success: true, message: 'OTP verified', resetToken: Buffer.from(email + ':' + Date.now()).toString('base64') });
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/reset-password ──
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.verifyOTP(otp))
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    user.password = newPassword;
    user.otp = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/refresh-token ──
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    sendTokens(user, 200, res);
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/logout ──
router.post('/logout', protect, async (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

// ── GET /api/v1/auth/me ──
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, data: user });
});

module.exports = router;
