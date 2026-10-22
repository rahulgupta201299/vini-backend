import nodemailer from 'nodemailer';

import { isProd, smtp } from '../config/env.js';

const { host, port, secure, user, pass, from } = smtp;

let transporter = null;

/** One SMTP connection, created the first time an email is sent. */
const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });

  return transporter;
};

const otpEmailHtml = ({ code, name = 'Admin' }) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0F172A">
  <div style="font-weight:800;font-size:20px;color:#13294B">VINI IAS <span style="color:#FE0034">Admin</span></div>
  <p style="margin:24px 0 8px">Hi ${name},</p>
  <p style="margin:0 0 16px;color:#475569">Use this code to finish signing in to the VINI admin panel:</p>
  <div style="font-size:32px;font-weight:800;letter-spacing:10px;padding:16px 0;text-align:center;background:#FFF0F3;border:1px solid #FFCCD6;border-radius:12px;color:#FE0034">${code}</div>
  <p style="margin:16px 0 0;color:#475569;font-size:14px">The code expires in 10 minutes. If you didn't try to sign in, change your password straight away.</p>
</div>`;

/** Checks the SMTP login at startup and logs the result. Never stops the server. */
export const verifySmtp = async () => {
  if (!host) {
    console.warn(
      '[mail] SMTP not configured (SMTP_HOST empty) — admin OTPs will be printed to this console.',
    );

    return false;
  }

  try {
    await getTransporter().verify();
    console.log(`[mail] SMTP ready: ${user || '(no auth)'} via ${host}:${port}`);

    return true;
  } catch (error) {
    console.error(`[mail] SMTP login failed (${host}:${port}): ${error.message}`);

    return false;
  }
};

/** Emails the 6-digit admin OTP. Without SMTP in development, the code is printed to the console. */
export const sendOtpEmail = async ({ to, code, name }) => {
  if (!host) {
    if (isProd) throw new Error('SMTP is not configured');

    console.log(`\n[mail] SMTP not configured — admin OTP for ${to}: ${code}\n`);

    return;
  }

  await getTransporter().sendMail({
    from,
    to,
    subject: `${code} is your VINI admin verification code`,
    text: `Your VINI admin verification code is ${code}. It expires in 10 minutes.`,
    html: otpEmailHtml({ code, name }),
  });
};
