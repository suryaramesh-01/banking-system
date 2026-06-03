const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: [true, 'Name required'], trim: true, maxlength: 60 },
  email:    { type: String, required: [true, 'Email required'], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  phone:    { type: String, required: [true, 'Phone required'], match: [/^\d{10}$/, 'Phone must be 10 digits'] },
  password: { type: String, required: [true, 'Password required'], minlength: 6, select: false },
  role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  status:   { type: String, enum: ['active', 'blocked', 'pending'], default: 'active' },
  dob:      { type: Date },
  address:  { type: String, maxlength: 200 },
  avatar:   { type: String, default: '' },
  kycStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  twoFactorEnabled: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastLogin: { type: Date },
  otp: { code: String, expiresAt: Date },
  refreshToken: { type: String, select: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

// Generate OTP
UserSchema.methods.generateOTP = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = { code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
  return code;
};

// Verify OTP
UserSchema.methods.verifyOTP = function (code) {
  return this.otp?.code === code && this.otp?.expiresAt > new Date();
};

// Virtual: isLocked
UserSchema.virtual('isLocked').get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

module.exports = mongoose.model('User', UserSchema);
