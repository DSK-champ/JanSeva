const User = require('../models/User');
const Otp = require('../models/Otp');
const Volunteer = require('../models/Volunteer');
const NGO = require('../models/NGO');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { sendOtpEmail } = require('../utils/mailer');
const logger = require('../utils/logger');

// ─── Helper: build token response ─────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.generateJWT();
  sendSuccess(res, statusCode, message, {
    token,
    user: user.toSafeObject(),
  });
};

// ─── Helper: generate a random 6-digit OTP ────────────────────────────────────
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ─── @route  POST /api/auth/send-otp ─────────────────────────────────────────
// ─── @desc   Send OTP to email for volunteer/ngo signup verification
// ─── @access Public
const sendOtp = asyncHandler(async (req, res, next) => {
  const { email, name, role } = req.body;

  if (!email || !name) {
    return next(new AppError('Email and name are required.', 400));
  }

  // Check if email is already registered
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  // Delete any existing OTPs for this email
  await Otp.deleteMany({ email });

  // Generate and store OTP (hashed via pre-save hook)
  const otpCode = generateOtp();
  await Otp.create({ email, otp: otpCode });

  // Send OTP email
  try {
    const sent = await sendOtpEmail(email, otpCode, name);
    if (!sent) {
      return next(new AppError('Unable to send OTP email. Please ensure SMTP is configured in Backend/.env', 500));
    }
  } catch (emailErr) {
    logger.error(`OTP email failed: ${emailErr.message}`);
    return next(new AppError(`Failed to send verification email: ${emailErr.message}`, 500));
  }

  logger.info(`OTP sent to ${email} for ${role || 'volunteer'} signup`);
  sendSuccess(res, 200, `Verification code sent to ${email}. It expires in 5 minutes.`);
});

// ─── @route  POST /api/auth/verify-otp ───────────────────────────────────────
// ─── @desc   Verify OTP and create account for volunteer/ngo
// ─── @access Public
const verifyOtpAndSignup = asyncHandler(async (req, res, next) => {
  const { email, otp, name, password, role } = req.body;

  if (!email || !otp || !name || !password) {
    return next(new AppError('All fields are required.', 400));
  }

  // Find the latest OTP for this email
  const storedOtp = await Otp.findOne({ email }).sort({ createdAt: -1 });
  if (!storedOtp) {
    return next(new AppError('OTP has expired or was not requested. Please request a new one.', 400));
  }

  // Compare submitted OTP with stored hash
  const isValid = await storedOtp.compareOtp(otp);
  if (!isValid) {
    return next(new AppError('Invalid OTP. Please check and try again.', 400));
  }

  // OTP is valid — clean up used OTPs
  await Otp.deleteMany({ email });

  // Check again if email was taken (race condition guard)
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  // Assign role (prevent self-admin)
  let assignedRole = role === 'admin' ? 'volunteer' : (role || 'volunteer');

  let user;
  try {
    // Create user
    user = await User.create({ name, email, password, role: assignedRole });

    // Auto-create volunteer profile
    if (assignedRole === 'volunteer') {
      await Volunteer.create({ userId: user._id });
    }

    // Auto-create NGO profile in pending state
    if (assignedRole === 'ngo') {
      await NGO.create({
        userId: user._id,
        name: name,
        organizationDetails: 'Pending details',
        location: { type: 'Point', coordinates: [78.9629, 20.5937] },
        coordinates: { lat: 20.5937, lng: 78.9629 }, // Explicit lat/lng for schema satisfaction
        approvalStatus: 'pending',
        isProfileComplete: false,
      });
    }
  } catch (error) {
    // Rollback: delete the user if profile creation failed
    if (user) {
      await User.findByIdAndDelete(user._id);
      logger.error(`Signup failed, rolled back user ${user.email}: ${error.message}`);
    }
    return next(error);
  }

  logger.info(`OTP verified & account created: ${user.email} (${user.role})`);
  sendTokenResponse(user, 201, res, 'Email verified and account created successfully');
});

// ─── @route  POST /api/auth/signup ───────────────────────────────────────────
// ─── @access Public (kept as fallback for non-OTP flows)
const signup = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Disallow self-signing as admin natively, default to volunteer
  let assignedRole = role === 'admin' ? 'volunteer' : (role || 'volunteer');
  
  // Special admin login back-door
  if (email === 'admin@gmail.com' || email === 'admin@janseva.com') {
    assignedRole = 'admin';
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  const user = await User.create({ name, email, password, role: assignedRole });

  // Auto-create volunteer profile
  if (assignedRole === 'volunteer') {
    await Volunteer.create({ userId: user._id });
  }

  // Auto-create NGO profile in pending state
  if (assignedRole === 'ngo') {
    await NGO.create({
      userId: user._id,
      name: name,
      organizationDetails: 'Pending details',
      location: { type: 'Point', coordinates: [78.9629, 20.5937] }, // Default to geographic center of India
      approvalStatus: 'pending',
      isProfileComplete: false
    });
  }

  logger.info(`New user signed up: ${user.email} (${user.role})`);
  sendTokenResponse(user, 201, res, 'Account created successfully');
});

// ─── @route  POST /api/auth/login ────────────────────────────────────────────
// ─── @access Public
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Explicitly select password (hidden by default)
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.password) {
    return next(new AppError('Invalid email or password.', 401));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid email or password.', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Contact support.', 403));
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  logger.info(`User logged in: ${user.email}`);
  sendTokenResponse(user, 200, res, 'Login successful');
});

// ─── @route  POST /api/auth/logout ───────────────────────────────────────────
// ─── @access Private
const logout = asyncHandler(async (req, res) => {
  // JWT is stateless; logout is handled client-side by deleting the token.
  // For server-side invalidation, a blacklist/Redis cache would be used.
  sendSuccess(res, 200, 'Logged out successfully');
});

// ─── @route  GET /api/auth/me ─────────────────────────────────────────────────
// ─── @access Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  sendSuccess(res, 200, 'User profile fetched', user.toSafeObject());
});

// ─── @route  GET /api/auth/google/callback ───────────────────────────────────
// ─── @access Public (OAuth callback)
const googleCallback = asyncHandler(async (req, res) => {
  // req.user is set by passport Google strategy
  const user = req.user;
  const token = user.generateJWT();
  // Redirect to frontend with token in query param (frontend stores in localStorage)
  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
});

module.exports = { signup, login, logout, getMe, googleCallback, sendOtp, verifyOtpAndSignup };
