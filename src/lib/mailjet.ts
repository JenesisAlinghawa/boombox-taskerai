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
    console.warn('⚠️  Gmail credentials not configured in .env.local');
    console.warn('   Email would be sent to:', to);
    console.warn('   Subject:', subject);
    console.warn('   Please add GMAIL_USER and GMAIL_APP_PASSWORD to .env.local');
    return;
  }

  try {
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
  } catch (err) {
    console.error('❌ Gmail send error:', err);
    throw err;
  }
}
