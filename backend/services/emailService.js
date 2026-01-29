// services/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Configure your email transporter
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    async sendOTP(toEmail, otpCode, purpose = 'email verification') {
        try {
            const mailOptions = {
                from: `"Indoor Booking App" <${process.env.EMAIL_USER}>`,
                to: toEmail,
                subject: `Your OTP for ${purpose}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Email Verification</h2>
            <p>You have requested to ${purpose}. Use the OTP below to complete the process:</p>
            <div style="background-color: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #111827; letter-spacing: 10px; font-size: 32px;">${otpCode}</h1>
            </div>
            <p>This OTP is valid for 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
            <p style="color: #6B7280; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('📧 Email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            throw new Error('Failed to send OTP email');
        }
    }

    async sendPasswordChangeNotification(toEmail, userName) {
        try {
            const mailOptions = {
                from: `"Indoor Booking App" <${process.env.EMAIL_USER}>`,
                to: toEmail,
                subject: 'Password Changed Successfully',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Password Updated</h2>
            <p>Hi ${userName},</p>
            <p>Your password has been successfully changed.</p>
            <p>If you didn't make this change, please contact our support team immediately.</p>
            <div style="background-color: #FEF2F2; padding: 15px; margin: 20px 0; border-left: 4px solid #DC2626;">
              <p style="color: #DC2626; margin: 0;">
                <strong>Security Tip:</strong> Never share your password with anyone.
              </p>
            </div>
            <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
            <p style="color: #6B7280; font-size: 12px;">This is an automated security notification.</p>
          </div>
        `
            };

            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('❌ Notification email failed:', error);
            // Don't throw error for notification failure
            return false;
        }
    }
}

module.exports = new EmailService();