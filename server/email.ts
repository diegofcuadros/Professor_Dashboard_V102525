import nodemailer from 'nodemailer';

const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : undefined,
  auth: process.env.EMAIL_USER && process.env.EMAIL_PASS ? {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  } : undefined,
  secure: false,
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
    secure: false,
    auth: emailConfig.auth,
  });

  const from = process.env.EMAIL_FROM || 'DataProfessor Dashboard <no-reply@dataprofessor.local>';
  await transporter.sendMail({ from, to: recipients, subject, html });
  return { ok: true, fallback: false } as const;
}
