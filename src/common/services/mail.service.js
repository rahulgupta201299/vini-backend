import nodemailer from 'nodemailer';
import { smtp, isProd } from '../../config/env.js';

let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    });
  }
  return transporter;
};

const otpEmailHtml = (code, name) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0F172A">
  <div style="font-weight:800;font-size:20px;color:#13294B">VINI IAS <span style="color:#FE0034">Admin</span></div>
  <p style="margin:24px 0 8px">Hi ${name || 'Admin'},</p>
  <p style="margin:0 0 16px;color:#475569">Use this code to finish signing in to the VINI admin panel:</p>
  <div style="font-size:32px;font-weight:800;letter-spacing:10px;padding:16px 0;text-align:center;background:#FFF0F3;border:1px solid #FFCCD6;border-radius:12px;color:#FE0034">${code}</div>
  <p style="margin:16px 0 0;color:#475569;font-size:14px">The code expires in 10 minutes. If you didn't try to sign in, change your password straight away.</p>
</div>`;

/** Checks the SMTP login once at startup and logs the result (does not stop the server). */
export const verifySmtp = async () => {
  if (!smtp.host) {
    console.warn('[mail] SMTP not configured (SMTP_HOST empty) — admin OTPs will be printed to this console.');
    return false;
  }
  try {
    await getTransporter().verify();
    console.log(`[mail] SMTP ready: ${smtp.user || '(no auth)'} via ${smtp.host}:${smtp.port}`);
    return true;
  } catch (err) {
    console.error(`[mail] SMTP login failed (${smtp.host}:${smtp.port}): ${err.message}`);
    return false;
  }
};

/** Emails the 6-digit admin OTP. Without SMTP settings in development, the code is printed to the console. */
export const sendOtpEmail = async ({ to, code, name }) => {
  if (!smtp.host) {
    if (isProd) throw new Error('SMTP is not configured');
    console.log(`\n[mail] SMTP not configured — admin OTP for ${to}: ${code}\n`);
    return;
  }
  await getTransporter().sendMail({
    from: smtp.from,
    to,
    subject: `${code} is your VINI admin verification code`,
    text: `Your VINI admin verification code is ${code}. It expires in 10 minutes.`,
    html: otpEmailHtml(code, name),
  });
};
