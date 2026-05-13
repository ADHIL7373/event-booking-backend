/**
 * Authentication Controller
 * Handles user registration, login, and authentication logic
 */

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken, generateRefreshToken } = require('../utils/jwtUtils');
const { isValidEmail } = require('../utils/validators');
const { validatePassword } = require('../utils/passwordValidator');
const { sanitizeObject } = require('../utils/sanitizer');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { sendPasswordResetOtp } = require('../utils/emailService');

/**
 * User Registration
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      logger.warn('Weak password registration attempt', { email });
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      logger.info('Registration failed - email already exists', { email });
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please login instead.',
      });
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(emailVerificationToken)
      .digest('hex');

    // Create user
    user = await User.create({
      fullName,
      email,
      password,
      role: 'user',
      emailVerificationToken: hashedToken,
      isEmailVerified: process.env.SKIP_EMAIL_VERIFICATION === 'true', // For development
    });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    logger.info('New user registered', { userId: user._id, email: user.email });

    // Send response
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      token,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message });
    next(error);
  }
};

/**
 * User Login
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      logger.warn('Login attempt - missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    if (!isValidEmail(email)) {
      logger.warn('Login attempt - invalid email format', { email });
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email',
      });
    }

    // Find user and get password (select: false by default)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      logger.warn('Login attempt - user not found', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isPasswordCorrect = await user.matchPassword(password);

    if (!isPasswordCorrect) {
      logger.warn('Login attempt - incorrect password', { userId: user._id });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    logger.info('User logged in successfully', { userId: user._id, email: user.email });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    next(error);
  }
};

/**
 * Get Current User
 * GET /api/auth/me
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update User Profile
 * PUT /api/auth/profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, profileImage } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        fullName: fullName || req.user.fullName,
        phone: phone || req.user.phone,
        profileImage: profileImage || req.user.profileImage,
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change Password
 * PUT /api/auth/change-password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all password fields',
      });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      logger.warn('Password change with weak password', { userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: 'New password does not meet security requirements',
        errors: passwordValidation.errors,
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from old password',
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      logger.warn('Password change - user not found', { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check old password
    const isPasswordCorrect = await user.matchPassword(oldPassword);
    if (!isPasswordCorrect) {
      logger.warn('Password change - old password incorrect', { userId: req.user.id });
      return res.status(401).json({
        success: false,
        message: 'Old password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    logger.info('Password changed successfully', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Password change error', { error: error.message, userId: req.user.id });
    next(error);
  }
};

/**
 * Logout
 * POST /api/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    // Token is typically handled on frontend by removing localStorage
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot Password - Generate and Send OTP
 * POST /api/auth/forgot-password
 * Body: { email }
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists (security best practice)
      logger.info('Forgot password request - user not found', { email });
      return res.status(200).json({
        success: true,
        message: 'If that email address is in our system, we will send an OTP to reset your password',
      });
    }

    // Check if user already has a valid OTP request in progress
    if (user.resetPasswordOtpExpires && user.resetPasswordOtpExpires > Date.now()) {
      logger.warn('Forgot password - OTP already sent recently', { userId: user._id });
      return res.status(400).json({
        success: false,
        message: 'An OTP has already been sent. Please check your email or wait before requesting a new one.',
      });
    }

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Set OTP expiry (10 minutes)
    const otpExpiryTime = 10 * 60 * 1000; // 10 minutes in milliseconds

    // Update user with OTP and expiry
    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpExpires = new Date(Date.now() + otpExpiryTime);
    user.resetPasswordAttempts = 0; // Reset attempts on new OTP
    user.resetPasswordAttemptExpires = null;

    await user.save();

    logger.info('OTP generated for password reset', { userId: user._id, email: user.email });

    // Send OTP via email
    const emailSent = await sendPasswordResetOtp(user.email, otp, 10);

    if (!emailSent) {
      logger.warn('Failed to send OTP email, but OTP stored in DB', { userId: user._id });
      // Still return success to user - email service might be down but OTP is stored
    }

    // Send response (don't expose OTP)
    res.status(200).json({
      success: true,
      message: 'OTP has been sent to your email address',
      email: user.email, // Return masked email for frontend
    });
  } catch (error) {
    logger.error('Forgot password error', { error: error.message });
    next(error);
  }
};

/**
 * Verify OTP
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (otp.length !== 6 || isNaN(otp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be 6 digits',
      });
    }

    // Find user with OTP fields
    const user = await User.findOne({ email }).select(
      '+resetPasswordOtp +resetPasswordOtpExpires +resetPasswordAttempts +resetPasswordAttemptExpires'
    );

    if (!user) {
      logger.warn('Verify OTP - user not found', { email });
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if OTP exists
    if (!user.resetPasswordOtp) {
      logger.warn('Verify OTP - no OTP generated', { userId: user._id });
      return res.status(400).json({
        success: false,
        message: 'No OTP request found. Please request a new one.',
      });
    }

    // Check if OTP has expired
    if (user.resetPasswordOtpExpires < Date.now()) {
      logger.warn('Verify OTP - OTP expired', { userId: user._id });
      user.resetPasswordOtp = null;
      user.resetPasswordOtpExpires = null;
      user.resetPasswordAttempts = 0;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Check brute force attempts (max 5 attempts)
    const maxAttempts = 5;
    const attemptWindowTime = 15 * 60 * 1000; // 15 minutes

    if (user.resetPasswordAttempts >= maxAttempts) {
      // Check if attempt window has passed
      if (
        user.resetPasswordAttemptExpires &&
        user.resetPasswordAttemptExpires > Date.now()
      ) {
        logger.warn('Verify OTP - max attempts exceeded', { userId: user._id });
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Please try again later.',
        });
      } else {
        // Reset attempts if window has passed
        user.resetPasswordAttempts = 0;
        user.resetPasswordAttemptExpires = null;
      }
    }

    // Verify OTP
    const isOtpValid = await user.matchOtp(otp);

    if (!isOtpValid) {
      user.resetPasswordAttempts += 1;
      if (user.resetPasswordAttempts === 1) {
        user.resetPasswordAttemptExpires = new Date(Date.now() + attemptWindowTime);
      }
      await user.save();

      logger.warn('Verify OTP - incorrect OTP', {
        userId: user._id,
        attempts: user.resetPasswordAttempts,
      });

      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${maxAttempts - user.resetPasswordAttempts} attempts remaining.`,
      });
    }

    logger.info('OTP verified successfully', { userId: user._id });

    // Generate a temporary reset token (valid for 15 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Store reset token temporarily
    user.resetPasswordOtp = hashedResetToken; // Reuse field for reset token
    user.resetPasswordOtpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    user.resetPasswordAttempts = 0;
    user.resetPasswordAttemptExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken, // Send to frontend for next step
      email: user.email,
    });
  } catch (error) {
    logger.error('OTP verification error', { error: error.message });
    next(error);
  }
};

/**
 * Reset Password
 * POST /api/auth/reset-password
 * Body: { email, resetToken, newPassword, confirmPassword }
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    // Validation
    if (!email || !resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      logger.warn('Password reset with weak password', { email });
      return res.status(400).json({
        success: false,
        message: 'New password does not meet security requirements',
        errors: passwordValidation.errors,
      });
    }

    // Find user
    const user = await User.findOne({ email }).select(
      '+resetPasswordOtp +resetPasswordOtpExpires +password'
    );

    if (!user) {
      logger.warn('Password reset - user not found', { email });
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if reset token is valid and not expired
    if (!user.resetPasswordOtpExpires || user.resetPasswordOtpExpires < Date.now()) {
      logger.warn('Password reset - reset token expired', { userId: user._id });
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired. Please request a new one.',
      });
    }

    // Verify reset token
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    if (user.resetPasswordOtp !== hashedResetToken) {
      logger.warn('Password reset - invalid reset token', { userId: user._id });
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token. Please try again.',
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await user.matchPassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your previous password',
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    user.resetPasswordAttempts = 0;
    user.resetPasswordAttemptExpires = null;

    await user.save();

    logger.info('Password reset successfully', { userId: user._id, email: user.email });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    });
  } catch (error) {
    logger.error('Password reset error', { error: error.message });
    next(error);
  }
};

