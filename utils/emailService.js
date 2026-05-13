/**
 * Email Service
 * Handles sending emails for verification and password reset
 */

const nodemailer = require('nodemailer');
const logger = require('./logger');

// Initialize transporter - configure based on email provider
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Verify the transporter connection
 */
const verifyTransporter = async () => {
  try {
    // Skip verification if not configured
    if (
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_PASSWORD
    ) {
      logger.warn(
        'Email service not configured - emails will not be sent'
      );
      return false;
    }

    await transporter.verify();
    logger.info('Email service verification successful');
    return true;
  } catch (error) {
    logger.error('Email service verification failed', {
      error: error.message,
      code: error.code,
      command: error.command,
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
    });
    return false;
  }
};

/**
 * Send email verification
 * @param {string} email - User email
 * @param {string} token - Verification token
 * @param {string} baseUrl - Frontend base URL
 */
exports.sendVerificationEmail = async (
  email,
  token,
  baseUrl = process.env.FRONTEND_URL
) => {
  try {
    const verificationUrl = `${baseUrl}/verify-email/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@eventbooking.com',
      to: email,
      subject: 'Email Verification - Smart Event Booking',
      html: `
        <h2>Welcome to Smart Event Booking!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="background-color: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Verify Email
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create this account, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info('Verification email sent', { email });
    return true;
  } catch (error) {
    logger.error('Error sending verification email', {
      email,
      error: error.message,
    });
    return false;
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} token - Reset token
 * @param {string} baseUrl - Frontend base URL
 */
exports.sendPasswordResetEmail = async (
  email,
  token,
  baseUrl = process.env.FRONTEND_URL
) => {
  try {
    const resetUrl = `${baseUrl}/reset-password/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@eventbooking.com',
      to: email,
      subject: 'Password Reset Request - Smart Event Booking',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Reset Password
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info('Password reset email sent', { email });
    return true;
  } catch (error) {
    logger.error('Error sending password reset email', {
      email,
      error: error.message,
    });
    return false;
  }
};

/**
 * Send booking confirmation email
 * @param {string} email - User email
 * @param {object} booking - Booking details
 */
exports.sendBookingConfirmationEmail = async (email, booking) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@eventbooking.com',
      to: email,
      subject: 'Booking Confirmation - Smart Event Booking',
      html: `
        <h2>Booking Confirmation</h2>
        <p>Your booking has been confirmed!</p>
        <h3>Booking Details:</h3>
        <ul>
          <li><strong>Booking ID:</strong> ${booking._id}</li>
          <li><strong>Event:</strong> ${booking.eventTitle}</li>
          <li><strong>Number of Tickets:</strong> ${booking.numberOfTickets}</li>
          <li><strong>Total Amount:</strong> $${booking.totalAmount}</li>
          <li><strong>Status:</strong> ${booking.status}</li>
        </ul>
        <p>You can download your ticket from your dashboard.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info('Booking confirmation email sent', { email, bookingId: booking._id });
    return true;
  } catch (error) {
    logger.error('Error sending booking confirmation email', {
      email,
      error: error.message,
    });
    return false;
  }
};

/**
 * Send OTP for password reset
 * @param {string} email - User email
 * @param {string} otp - One-time password (6 digits)
 * @param {number} expiryMinutes - OTP expiry time in minutes (default: 10)
 */
exports.sendPasswordResetOtp = async (email, otp, expiryMinutes = 10) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@eventbooking.com',
      to: email,
      subject: 'Password Reset OTP - Smart Event Booking',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset OTP</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              background: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
            }
            .header {
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
              color: white;
              padding: 2rem;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 1.8rem;
              font-weight: 700;
            }
            .content {
              padding: 2rem;
            }
            .otp-box {
              background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
              border: 2px solid #e5e5ea;
              border-radius: 12px;
              padding: 1.5rem;
              text-align: center;
              margin: 1.5rem 0;
            }
            .otp-code {
              font-size: 2.5rem;
              font-weight: 700;
              letter-spacing: 0.5rem;
              color: #ff6b6b;
              font-family: 'Courier New', monospace;
              margin: 0;
              font-kerning: none;
            }
            .otp-label {
              color: #86868b;
              font-size: 0.9rem;
              margin: 0.5rem 0 0 0;
            }
            .info {
              background: #fff3cd;
              border-left: 4px solid #ff9500;
              padding: 1rem;
              margin: 1.5rem 0;
              border-radius: 4px;
              font-size: 0.95rem;
              color: #664d03;
            }
            .footer {
              background: #f5f5f7;
              padding: 1.5rem;
              text-align: center;
              font-size: 0.8rem;
              color: #86868b;
              border-top: 1px solid #e5e5ea;
            }
            .button {
              display: inline-block;
              background: #ff6b6b;
              color: white;
              padding: 0.75rem 1.5rem;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              margin-top: 1rem;
            }
            .button:hover {
              background: #ee5a6f;
            }
            .warning {
              color: #ff3b30;
              font-size: 0.9rem;
              margin-top: 0.5rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset OTP</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password. Here's your one-time password (OTP):</p>
              
              <div class="otp-box">
                <p class="otp-code">${otp}</p>
                <p class="otp-label">Valid for ${expiryMinutes} minutes</p>
              </div>

              <div class="info">
                <strong>⏱️ Important:</strong> This OTP will expire in ${expiryMinutes} minutes. Do not share this code with anyone.
              </div>

              <p><strong>Steps to reset your password:</strong></p>
              <ol>
                <li>Go to our password reset page</li>
                <li>Enter this OTP: <strong>${otp}</strong></li>
                <li>Set your new password</li>
                <li>Confirm your new password</li>
              </ol>

              <p class="warning">
                ⚠️ If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              </p>

              <p><strong>Security Tips:</strong></p>
              <ul>
                <li>Never share your OTP with anyone</li>
                <li>Smart Event Booking will never ask for your OTP via phone or email</li>
                <li>If you're unsure about this request, contact our support team</li>
              </ul>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Smart Event Booking System. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info('Password reset OTP email sent', { email });
    return true;
  } catch (error) {
    logger.error('Error sending password reset OTP email', {
      email,
      error: error.message,
    });
    return false;
  }
};

/**
 * Verify transporter and initialize email service
 */
exports.verifyTransporter = verifyTransporter;
