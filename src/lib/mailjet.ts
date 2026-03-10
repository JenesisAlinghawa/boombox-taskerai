import nodemailer from 'nodemailer';

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

export async function sendEmail(to: string, subject: string, html: string, text?: string) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error('❌ Email sending failed: Gmail credentials not configured');
    console.error('   GMAIL_USER:', GMAIL_USER ? '✓ Set' : '✗ Missing');
    console.error('   GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? '✓ Set' : '✗ Missing');
    throw new Error('Email service is not configured. Please contact support.');
  }

  try {
    console.log(`[Email] Attempting to send to: ${to}`);
    const transporter = getTransporter();
    const res = await transporter.sendMail({
      from: GMAIL_USER,
      to,
      subject,
      text: text || subject,
      html,
    });
    console.log('✓ Email sent successfully to:', to);
    return res;
  } catch (err: any) {
    console.error('❌ Gmail send error details:', {
      message: err.message,
      code: err.code,
      response: err.response,
    });
    throw err;
  }
}
