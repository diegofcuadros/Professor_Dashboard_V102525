import nodemailer from 'nodemailer';

const emailConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
  secure: process.env.SMTP_SECURE === 'true',
};

function isConfigured(): boolean {
  return Boolean(emailConfig.host && emailConfig.port && emailConfig.auth);
}

export async function sendEmail(to: string | string[], subject: string, html: string) {
  const recipients = Array.isArray(to) ? to.join(',') : to;

  if (!isConfigured()) {
    console.log('✉️ [email:console-fallback]', { to: recipients, subject });
    console.log(html);
    return { ok: true, fallback: true } as const;
  }

  const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
  });

  const from = process.env.FROM_EMAIL || 'DataProfessor Dashboard <no-reply@dataprofessor.local>';
  await transporter.sendMail({ from, to: recipients, subject, html });
  return { ok: true, fallback: false } as const;
}
