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
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { margin: 20px 0; line-height: 1.6; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to TaskerAI! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName},</p>
            <p>Your account has been approved! You're now ready to collaborate with your team and track tasks like a pro.</p>
            <p>
              <a href="${data.appUrl}/auth/login" class="button">Log in to TaskerAI</a>
            </p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 TaskerAI. All rights reserved.</p>
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
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; }
          .content { margin: 20px 0; line-height: 1.6; }
          .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>TaskerAI Signup Status</h2>
          </div>
          <div class="content">
            <p>Hi ${data.firstName},</p>
            <p>Thank you for your interest in TaskerAI. Unfortunately, your signup request could not be approved at this time.</p>
            <p>If you have any questions or would like more information, please contact our admin team.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 TaskerAI. All rights reserved.</p>
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
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { margin: 20px 0; line-height: 1.6; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited to TaskerAI!</h1>
          </div>
          <div class="content">
            <p>Hi there!</p>
            <p>${data.senderName} has invited you to join TaskerAI, a powerful team task management platform.</p>
            <p>
              <a href="${data.inviteLink}" class="button">Accept Invitation</a>
            </p>
            <p>This link expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 TaskerAI. All rights reserved.</p>
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
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { margin: 20px 0; line-height: 1.6; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to TaskerAI! 👋</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName || 'there'},</p>
            <p>Thanks for signing up for TaskerAI! Click the button below to verify your email address and complete your account setup.</p>
            <p>
              <a href="${data.verificationLink}" class="button">Verify Email & Create Account</a>
            </p>
            <p>This link expires in 24 hours.</p>
            <p>If you didn't create this account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 TaskerAI. All rights reserved.</p>
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
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { margin: 20px 0; line-height: 1.6; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName || 'there'},</p>
            <p>We received a request to reset your TaskerAI password. Click the button below to create a new password.</p>
            <p>
              <a href="${data.resetLink}" class="button">Reset Password</a>
            </p>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 TaskerAI. All rights reserved.</p>
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
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { margin: 20px 0; line-height: 1.6; }
          .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Deactivated</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName},</p>
            <p>Your TaskerAI account has been deactivated by an administrator. You will no longer be able to log in or access your account.</p>
            <p>If you believe this is a mistake or have questions about this action, please contact your team administrator.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 TaskerAI. All rights reserved.</p>
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
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { margin: 20px 0; line-height: 1.6; }
          .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Permanently Deleted</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName},</p>
            <p>Your TaskerAI account has been permanently deleted from our system by an administrator. All your data associated with this account has been removed.</p>
            <p>If you wish to use TaskerAI again, you can register with a new account.</p>
            <p>If you have any questions, please contact your team administrator.</p>
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
