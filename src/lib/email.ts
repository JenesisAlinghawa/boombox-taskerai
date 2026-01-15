/**
 * Email Sending Utility
 * 
 * Integrates with email service (currently using Mailjet via environment variables)
 * Sends various email templates
 */

interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export const sendEmail = async (emailData: EmailData) => {
  try {
    // Use Mailjet API or any other email service
    const mailjetApiKey = process.env.MAILJET_API_KEY;
    const mailjetApiSecret = process.env.MAILJET_API_SECRET;

    if (!mailjetApiKey || !mailjetApiSecret) {
      console.warn("Email service not configured. Email not sent.");
      return;
    }

    const auth = Buffer.from(`${mailjetApiKey}:${mailjetApiSecret}`).toString("base64");

    const emailContent = getEmailTemplate(emailData.template, emailData.data);

    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_FROM_EMAIL || "noreply@taskerat.com",
              Name: "TaskerAI",
            },
            To: [
              {
                Email: emailData.to,
              },
            ],
            Subject: emailData.subject,
            HTMLPart: emailContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    console.log(`Email sent to ${emailData.to}`);
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

export default sendEmail;
