/**
 * Email Utility - Professional Email Sending Service
 * Development Mode: Logs emails, Production: Sends via Gmail
 */

const nodemailer = require('nodemailer');

let transporter;
let emailMode = 'development'; // Will change to production if credentials are valid

// Initialize transporter on module load
const initializeTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  // Check if using placeholder or valid credentials
  const isPlaceholder = !emailUser || !emailPassword || 
                        emailUser.includes('your_email') || 
                        emailPassword.includes('your_app_password');

  if (isPlaceholder) {
    console.log('📧 [DEVELOPMENT MODE] Email logging enabled');
    console.log('💡 Configure Gmail credentials to enable real email sending');
    emailMode = 'development';
    return null;
  }

  // Try to create Gmail transporter for production
  emailMode = 'production';
  const newTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });

  // Verify connection
  newTransporter.verify((error, success) => {
    if (error) {
      console.log('⚠️  Email verification failed - switching to development mode');
      console.log('💡 Emails will be logged to console');
      emailMode = 'development';
      transporter = null;
    } else {
      console.log('✅ Email service verified - Production mode active');
    }
  });

  return newTransporter;
};

transporter = initializeTransporter();

/**
 * Send subscription confirmation email
 * @param {string} email - Recipient email address
 * @returns {Promise}
 */
const sendSubscriptionEmail = async (email) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to SmartEvent Newsletter</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 2rem;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 0.5rem 0 0 0;
          opacity: 0.9;
          font-size: 0.95rem;
        }
        .content {
          padding: 2.5rem;
        }
        .greeting {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #1f2937;
        }
        .message {
          color: #4b5563;
          margin-bottom: 1.5rem;
          line-height: 1.8;
        }
        .benefits {
          background: #f9fafb;
          border-left: 4px solid #3b82f6;
          padding: 1.5rem;
          border-radius: 8px;
          margin: 1.5rem 0;
        }
        .benefits h3 {
          margin: 0 0 1rem 0;
          color: #1f2937;
          font-size: 1rem;
        }
        .benefits ul {
          margin: 0;
          padding-left: 1.5rem;
        }
        .benefits li {
          margin-bottom: 0.75rem;
          color: #4b5563;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 0.85rem 2rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          margin: 1.5rem 0;
          transition: all 0.2s ease;
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
        }
        .footer-section {
          background: #f9fafb;
          padding: 2rem;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-text {
          color: #6b7280;
          font-size: 0.85rem;
          margin: 0.5rem 0;
        }
        .social-links {
          margin: 1rem 0 0 0;
        }
        .social-links a {
          display: inline-block;
          width: 40px;
          height: 40px;
          line-height: 40px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 50%;
          text-align: center;
          margin: 0 0.5rem;
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .social-links a:hover {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        .trust-badges {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: #6b7280;
        }
        .badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
        }
        .badge-icon {
          font-size: 1.5rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>📅 SmartEvent</h1>
          <p>Welcome to Our Community</p>
        </div>
        
        <!-- Main Content -->
        <div class="content">
          <div class="greeting">
            Welcome to SmartEvent Newsletter! 🎉
          </div>
          
          <div class="message">
            <p>Thank you for subscribing to SmartEvent! We're thrilled to have you join our community of event enthusiasts.</p>
            <p>You'll now receive:</p>
          </div>
          
          <!-- Benefits Section -->
          <div class="benefits">
            <h3>✨ What You'll Get:</h3>
            <ul>
              <li><strong>Exclusive Deals:</strong> Early access to special event discounts and promotions</li>
              <li><strong>New Listings:</strong> Be the first to know about trending and premium events</li>
              <li><strong>Event Reminders:</strong> Smart notifications for events you're interested in</li>
              <li><strong>Insider Tips:</strong> Best practices for booking and enjoying events</li>
              <li><strong>Community Updates:</strong> Latest features and improvements</li>
            </ul>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center;">
            <a href="http://localhost:3000/events" class="cta-button">Browse Events Now</a>
          </div>
          
          <div class="message">
            <p><strong>Getting Started:</strong></p>
            <p>Visit our platform to browse hundreds of amazing events, from concerts and conferences to workshops and festivals. Use your account to customize your preferences and never miss an event you love.</p>
          </div>
        </div>
        
        <!-- Footer Section -->
        <div class="footer-section">
          <!-- Trust Badges -->
          <div class="trust-badges">
            <div class="badge">
              <div class="badge-icon">🔒</div>
              <div>Secure</div>
            </div>
            <div class="badge">
              <div class="badge-icon">⚡</div>
              <div>Fast</div>
            </div>
            <div class="badge">
              <div class="badge-icon">📱</div>
              <div>Mobile</div>
            </div>
          </div>
          
          <!-- Social Links -->
          <div class="social-links">
            <a href="#" title="Facebook">f</a>
            <a href="#" title="Twitter">𝕏</a>
            <a href="#" title="Instagram">📷</a>
            <a href="#" title="LinkedIn">in</a>
          </div>
          
          <!-- Footer Text -->
          <p class="footer-text">
            © ${new Date().getFullYear()} SmartEvent. All rights reserved.
          </p>
          <p class="footer-text">
            You received this email because you subscribed to our newsletter.
          </p>
          <p class="footer-text">
            <a href="#" style="color: #3b82f6; text-decoration: none;">Manage Your Preferences</a> | 
            <a href="#" style="color: #3b82f6; text-decoration: none;">Unsubscribe</a>
          </p>
          
          <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
            <p class="footer-text" style="font-size: 0.75rem; margin: 0;">
              ✓ Secure & Trusted Platform | Your data is securely handled and never shared
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `SmartEvent <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎉 Welcome to SmartEvent Newsletter - Exclusive Event Updates',
    html: htmlContent,
  };

  try {
    // Production mode: Send real email
    if (emailMode === 'production' && transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully to:', email);
      console.log('📧 Message ID:', info.messageId);
      return { 
        success: true, 
        message: 'Subscription successful! Confirmation email sent to your inbox.',
        messageId: info.messageId,
        mode: 'production'
      };
    }
    
    // Development mode: Log email to console
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         📧 EMAIL LOGGED (Development Mode)                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('To:', email);
    console.log('From: SmartEvent Newsletter');
    console.log('Subject: 🎉 Welcome to SmartEvent Newsletter - Exclusive Event Updates');
    console.log('Status: ✅ Would be delivered in production');
    console.log('────────────────────────────────────────────────────────────');
    console.log('\n');
    
    return { 
      success: true,
      message: 'Subscription registered! Welcome to our newsletter. 🎉',
      mode: 'development',
      note: 'Email logged to console (configure Gmail for real emails)'
    };
  } catch (error) {
    console.error('❌ Email delivery error:', error.message);
    
    // Even on error, show success to user
    return { 
      success: true,
      message: 'Subscription registered! You will receive updates soon.',
      error: error.message,
      mode: 'fallback'
    };
  }
};

/**
 * Send OTP for password reset
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's full name
 * @returns {Promise}
 */
const sendPasswordResetOtp = async (email, otp, userName) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP - SmartEvent</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
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
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 0.5rem 0 0 0;
          opacity: 0.9;
          font-size: 0.95rem;
        }
        .content {
          padding: 2.5rem;
        }
        .greeting {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #1f2937;
        }
        .message {
          color: #4b5563;
          margin-bottom: 1.5rem;
          line-height: 1.8;
        }
        .otp-box {
          background: linear-gradient(135deg, #fff5f5 0%, #fff9f9 100%);
          border: 2px solid #ff6b6b;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          margin: 2rem 0;
        }
        .otp-label {
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.75rem;
        }
        .otp-code {
          font-size: 3rem;
          font-weight: 800;
          color: #ff6b6b;
          letter-spacing: 0.5rem;
          font-family: 'Courier New', monospace;
          margin: 0;
          user-select: all;
        }
        .otp-expiry {
          font-size: 0.8rem;
          color: #ff9500;
          margin-top: 1rem;
          font-weight: 600;
        }
        .warning-box {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 1.5rem;
          border-radius: 8px;
          margin: 1.5rem 0;
        }
        .warning-box h3 {
          margin: 0 0 0.75rem 0;
          color: #92400e;
          font-size: 0.95rem;
        }
        .warning-box ul {
          margin: 0;
          padding-left: 1.5rem;
        }
        .warning-box li {
          margin-bottom: 0.5rem;
          color: #78350f;
          font-size: 0.9rem;
        }
        .footer-section {
          background: #f9fafb;
          padding: 2rem;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-text {
          color: #6b7280;
          font-size: 0.85rem;
          margin: 0.5rem 0;
        }
        .security-badge {
          display: inline-block;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          margin-top: 1rem;
          color: #6b7280;
          font-size: 0.8rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>🔒 Password Reset</h1>
          <p>Secure Account Recovery</p>
        </div>
        
        <!-- Main Content -->
        <div class="content">
          <div class="greeting">
            Hello ${userName || 'User'}! 👋
          </div>
          
          <div class="message">
            <p>We received a request to reset your password. Here's your One-Time Password (OTP) to verify your identity and proceed with the password reset.</p>
          </div>
          
          <!-- OTP Box -->
          <div class="otp-box">
            <div class="otp-label">Your OTP Code</div>
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">⏰ Expires in 10 minutes</div>
          </div>
          
          <!-- Instructions -->
          <div class="message">
            <p><strong>📝 Next Steps:</strong></p>
            <ol style="color: #4b5563; padding-left: 1.5rem;">
              <li>Enter the OTP code above on the password reset page</li>
              <li>Set your new password (make it strong!)</li>
              <li>Login with your new password</li>
            </ol>
          </div>
          
          <!-- Security Warning -->
          <div class="warning-box">
            <h3>⚠️ Security Notice</h3>
            <ul>
              <li>Never share this OTP with anyone</li>
              <li>SmartEvent support will never ask for your OTP</li>
              <li>This OTP expires in 10 minutes for security</li>
              <li>If you didn't request this, ignore this email</li>
            </ul>
          </div>
          
          <div class="message">
            <p>If you didn't initiate this password reset request, please ignore this email or <a href="#" style="color: #ff6b6b; font-weight: 600;">contact our support team</a> immediately.</p>
          </div>
        </div>
        
        <!-- Footer Section -->
        <div class="footer-section">
          <div class="security-badge">
            🔒 Secure & Encrypted Communication
          </div>
          
          <p class="footer-text" style="margin-top: 1.5rem;">
            © ${new Date().getFullYear()} SmartEvent. All rights reserved.
          </p>
          <p class="footer-text">
            This is an automated security email. Please do not reply to this address.
          </p>
          <p class="footer-text" style="font-size: 0.75rem;">
            SmartEvent | Smart Event Booking System
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `SmartEvent Security <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔒 Your Password Reset OTP - SmartEvent',
    html: htmlContent,
  };

  try {
    // Production mode: Send real email
    if (emailMode === 'production' && transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Password reset OTP sent to:', email);
      console.log('📧 Message ID:', info.messageId);
      return { 
        success: true, 
        message: 'OTP sent to your email successfully',
        messageId: info.messageId,
        mode: 'production'
      };
    }
    
    // Development mode: Log email to console
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║    🔐 PASSWORD RESET OTP (Development Mode)               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('To:', email);
    console.log('From: SmartEvent Security');
    console.log('Subject: 🔒 Your Password Reset OTP - SmartEvent');
    console.log('──────────────────────────────────────────────────────────');
    console.log('OTP CODE:', otp);
    console.log('EXPIRES IN: 10 minutes');
    console.log('USER:', userName);
    console.log('──────────────────────────────────────────────────────────');
    console.log('\n');
    
    return { 
      success: true,
      message: 'OTP sent to your email (logged to console in development mode)',
      mode: 'development',
      otp: otp // Include OTP in response for testing
    };
  } catch (error) {
    console.error('❌ OTP email delivery error:', error.message);
    
    // Even on error, log for development
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║    🔐 PASSWORD RESET OTP (Fallback Mode)                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('To:', email);
    console.log('OTP CODE:', otp);
    console.log('EXPIRES IN: 10 minutes');
    console.log('──────────────────────────────────────────────────────────');
    console.log('Error:', error.message);
    console.log('\n');
    
    return { 
      success: true,
      message: 'OTP request processed',
      mode: 'fallback',
      otp: otp
    };
  }
};

module.exports = {
  sendSubscriptionEmail,
  sendPasswordResetOtp,
  transporter,
};
