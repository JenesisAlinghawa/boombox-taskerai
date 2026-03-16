/**
 * Email Sending Utility
 * 
 * Integrates with Gmail via Nodemailer
 * Sends various email templates
 */

import nodemailer from 'nodemailer';

interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

let transporter: any = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export const sendEmail = async (emailData: EmailData) => {
  try {
    // Check Gmail credentials
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error('❌ Email service not configured: Gmail credentials missing');
      console.error('   GMAIL_USER:', GMAIL_USER ? '✓ Set' : '✗ Missing');
      console.error('   GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? '✓ Set' : '✗ Missing');
      throw new Error('Email service is not configured. Please contact support.');
    }

    const emailContent = getEmailTemplate(emailData.template, emailData.data);

    try {
      console.log(`[Email] Attempting to send to: ${emailData.to}`);
      const transporter = getTransporter();
      const res = await transporter.sendMail({
        from: GMAIL_USER,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.subject,
        html: emailContent,
      });
      console.log('✓ Email sent successfully to:', emailData.to);
      return res;
    } catch (err: any) {
      console.error('❌ Gmail send error details:', {
        message: err.message,
        code: err.code,
        response: err.response,
      });
      throw err;
    }
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

function getEmailTemplate(template: string, data: Record<string, any>): string {
  switch (template) {
    case "welcome":
      return getWelcomeEmailTemplate(data as { firstName: string; lastName: string; appUrl: string });
    case "denial":
      return getDenialEmailTemplate(data as { firstName: string; lastName: string });
    case "invite":
      return getInviteEmailTemplate(data as { inviteLink: string; senderName: string });
    case "verification":
      return getVerificationEmailTemplate(data as { firstName: string; verificationLink: string });
    case "reset":
      return getResetEmailTemplate(data as { firstName: string; resetLink: string });
    case "deactivated":
      return getDeactivatedEmailTemplate(data as { firstName: string });
    case "deleted":
      return getDeletedEmailTemplate(data as { firstName: string });
    default:
      return `<p>Hello,</p><p>Email template not found.</p>`;
  }
}

function getWelcomeEmailTemplate(data: {
  firstName: string;
  lastName: string;
  appUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background-color: #f3f4f6;
            color: #1f2937;
            line-height: 1.6;
          }
          .wrapper {
            background-color: #f3f4f6;
            padding: 40px 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 48px 40px;
            text-align: center;
          }
          .header h1 {
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .content {
            padding: 40px;
          }
          .greeting {
            font-size: 16px;
            color: #374151;
            margin-bottom: 24px;
          }
          .message {
            font-size: 15px;
            color: #4b5563;
            line-height: 1.8;
            margin-bottom: 32px;
          }
          .message p {
            margin-bottom: 16px;
          }
          .button-wrapper {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 14px 48px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
          .footer {
            background-color: #f9fafb;
            padding: 32px 40px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
          }
          .footer p {
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>Welcome to TaskerAI! 🎉</h1>
            </div>
            <div class="content">
              <div class="greeting">
                Hi ${data.firstName},
              </div>
              <div class="message">
                <p>Your account has been approved! You're now ready to collaborate with your team and start tracking tasks like a pro.</p>
                <p>Click the button below to log in and get started.</p>
              </div>
              <div class="button-wrapper">
                <a href="${data.appUrl}/auth/login" class="button">Log in to TaskerAI</a>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2026 TaskerAI. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getDenialEmailTemplate(data: {
  firstName: string;
  lastName: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background-color: #f3f4f6;
            color: #1f2937;
            line-height: 1.6;
          }
          .wrapper {
            background-color: #f3f4f6;
            padding: 40px 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
            color: white;
            padding: 48px 40px;
            text-align: center;
          }
          .header h1 {
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .content {
            padding: 40px;
          }
          .greeting {
            font-size: 16px;
            color: #374151;
            margin-bottom: 24px;
          }
          .message {
            font-size: 15px;
            color: #4b5563;
            line-height: 1.8;
            margin-bottom: 24px;
          }
          .message p {
            margin-bottom: 16px;
          }
          .footer {
            background-color: #f9fafb;
            padding: 32px 40px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
          }
          .footer p {
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>Application Status</h1>
            </div>
            <div class="content">
              <div class="greeting">
                Hi ${data.firstName},
              </div>
              <div class="message">
                <p>Thank you for your interest in TaskerAI. Unfortunately, your signup request could not be approved at this time.</p>
                <p>If you have any questions or would like more information, please contact our admin team.</p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2026 TaskerAI. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getInviteEmailTemplate(data: {
  inviteLink: string;
  senderName: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background-color: #f3f4f6;
            color: #1f2937;
            line-height: 1.6;
          }
          .wrapper {
            background-color: #f3f4f6;
            padding: 40px 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 48px 40px;
            text-align: center;
          }
          .header h1 {
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          .header p {
            font-size: 16px;
            opacity: 0.95;
            font-weight: 500;
          }
          .content {
            padding: 40px;
          }
          .greeting {
            font-size: 16px;
            color: #374151;
            margin-bottom: 24px;
          }
          .greeting strong {
            color: #1f2937;
          }
          .message {
            font-size: 15px;
            color: #4b5563;
            line-height: 1.8;
            margin-bottom: 32px;
          }
          .message p {
            margin-bottom: 16px;
          }
          .button-wrapper {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 14px 48px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.2s;
            border: 2px solid #2563eb;
          }
          .button:hover {
            background-color: #1d4ed8;
            border-color: #1d4ed8;
          }
          .note {
            background-color: #f0f9ff;
            border-left: 4px solid #2563eb;
            padding: 16px;
            border-radius: 6px;
            margin: 32px 0;
            font-size: 14px;
            color: #0c4a6e;
          }
          .footer {
            background-color: #f9fafb;
            padding: 32px 40px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
          }
          .footer p {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
          }
          .footer-link {
            color: #2563eb;
            text-decoration: none;
          }
          .footer-link:hover {
            text-decoration: underline;
          }
          .divider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 24px 0;
          }
          @media (max-width: 600px) {
            .container { border-radius: 8px; }
            .header { padding: 32px 24px; }
            .header h1 { font-size: 24px; }
            .content { padding: 24px; }
            .button { padding: 12px 32px; font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>You're Invited! 🎉</h1>
              <p>Join TaskerAI Today</p>
            </div>

            <!-- Content -->
            <div class="content">
              <div class="greeting">
                Hi there,
              </div>

              <div class="message">
                <p><strong>${data.senderName}</strong> has invited you to join <strong>TaskerAI</strong>, a powerful team collaboration and task management platform.</p>
                <p>Get started by clicking the button below to register and set up your account. You'll be automatically approved and ready to start collaborating with your team immediately.</p>
              </div>

              <div class="button-wrapper">
                <a href="${data.inviteLink}" class="button">Accept & Register</a>
              </div>

              <div class="note">
                <strong>⏰ Expires in 7 days</strong><br>
                This invitation link will expire in 7 days. If you didn't expect this invitation or have any questions, please contact your admin.
              </div>

              <div class="divider"></div>

              <p style="font-size: 13px; color: #6b7280;">
                Once you complete your registration, you'll have full access to TaskerAI and can start managing team tasks, collaborating with teammates, and tracking project progress.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p>&copy; 2026 TaskerAI. All rights reserved.</p>
              <p>
                <a href="https://taskera.com" class="footer-link">Visit Website</a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getVerificationEmailTemplate(data: {
  firstName: string;
  verificationLink: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background-color: #f3f4f6;
            color: #1f2937;
            line-height: 1.6;
          }
          .wrapper {
            background-color: #f3f4f6;
            padding: 40px 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 48px 40px;
            text-align: center;
          }
          .header h1 {
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .content {
            padding: 40px;
          }
          .greeting {
            font-size: 16px;
            color: #374151;
            margin-bottom: 24px;
          }
          .message {
            font-size: 15px;
            color: #4b5563;
            line-height: 1.8;
            margin-bottom: 32px;
          }
          .message p {
            margin-bottom: 16px;
          }
          .button-wrapper {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 14px 48px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
          .note {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            border-radius: 6px;
            margin: 32px 0;
            font-size: 14px;
            color: #92400e;
          }
          .footer {
            background-color: #f9fafb;
            padding: 32px 40px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
          }
          .footer p {
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>Welcome to TaskerAI! 👋</h1>
            </div>
            <div class="content">
              <div class="greeting">
                Hi ${data.firstName || 'there'},
              </div>
              <div class="message">
                <p>Thanks for signing up! Click the button below to verify your email address and complete your account setup.</p>
              </div>
              <div class="button-wrapper">
                <a href="${data.verificationLink}" class="button">Verify Email & Create Account</a>
              </div>
              <div class="note">
                <strong>⏰ Expires in 24 hours</strong><br>
                This verification link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2026 TaskerAI. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getResetEmailTemplate(data: {
  firstName: string;
  resetLink: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background-color: #f3f4f6;
            color: #1f2937;
            line-height: 1.6;
          }
          .wrapper {
            background-color: #f3f4f6;
            padding: 40px 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 48px 40px;
            text-align: center;
          }
          .header h1 {
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .content {
            padding: 40px;
          }
          .greeting {
            font-size: 16px;
            color: #374151;
            margin-bottom: 24px;
          }
          .message {
            font-size: 15px;
            color: #4b5563;
            line-height: 1.8;
            margin-bottom: 32px;
          }
          .message p {
            margin-bottom: 16px;
          }
          .button-wrapper {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            background-color: #f59e0b;
            color: white;
            padding: 14px 48px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
          }
          .button:hover {
            background-color: #d97706;
          }
          .note {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            border-radius: 6px;
            margin: 32px 0;
            font-size: 14px;
            color: #92400e;
          }
          .footer {
            background-color: #f9fafb;
            padding: 32px 40px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
          }
          .footer p {
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>🔐 Reset Your Password</h1>
            </div>
            <div class="content">
              <div class="greeting">
                Hi ${data.firstName || 'there'},
              </div>
              <div class="message">
                <p>We received a request to reset your TaskerAI password. Click the button below to create a new password.</p>
              </div>
              <div class="button-wrapper">
                <a href="${data.resetLink}" class="button">Reset Password</a>
              </div>
              <div class="note">
                <strong>⏰ Expires in 1 hour</strong><br>
                This reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2026 TaskerAI. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getDeactivatedEmailTemplate(data: {
  firstName: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background-color: #f3f4f6;
            color: #1f2937;
            line-height: 1.6;
          }
          .wrapper {
            background-color: #f3f4f6;
            padding: 40px 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 48px 40px;
            text-align: center;
          }
          .header h1 {
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .content {
            padding: 40px;
          }
          .greeting {
            font-size: 16px;
            color: #374151;
            margin-bottom: 24px;
          }
          .message {
            font-size: 15px;
            color: #4b5563;
            line-height: 1.8;
            margin-bottom: 24px;
          }
          .message p {
            margin-bottom: 16px;
          }
          .footer {
            background-color: #f9fafb;
            padding: 32px 40px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
          }
          .footer p {
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>Account Deactivated</h1>
            </div>
            <div class="content">
              <div class="greeting">
                Hi ${data.firstName},
              </div>
              <div class="message">
                <p>Your TaskerAI account has been deactivated by an administrator. You will no longer be able to log in or access your account.</p>
                <p>If you believe this is a mistake or have questions about this action, please contact your team administrator.</p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2026 TaskerAI. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getDeletedEmailTemplate(data: {
  firstName: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background-color: #f3f4f6;
            color: #1f2937;
            line-height: 1.6;
          }
          .wrapper {
            background-color: #f3f4f6;
            padding: 40px 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 48px 40px;
            text-align: center;
          }
          .header h1 {
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .content {
            padding: 40px;
          }
          .greeting {
            font-size: 16px;
            color: #374151;
            margin-bottom: 24px;
          }
          .message {
            font-size: 15px;
            color: #4b5563;
            line-height: 1.8;
            margin-bottom: 24px;
          }
          .message p {
            margin-bottom: 16px;
          }
          .footer {
            background-color: #f9fafb;
            padding: 32px 40px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
          }
          .footer p {
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>Account Permanently Deleted</h1>
            </div>
            <div class="content">
              <div class="greeting">
                Hi ${data.firstName},
              </div>
              <div class="message">
                <p>Your TaskerAI account has been permanently deleted from our system by an administrator. All your data associated with this account has been removed.</p>
                <p>If you wish to use TaskerAI again, you can register with a new account.</p>
                <p>If you have any questions, please contact your team administrator.</p>
              </div>
            </div>
            <div class="footer">
            <p>&copy; 2026 TaskerAI. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export default sendEmail;
