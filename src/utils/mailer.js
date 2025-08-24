import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transport = env.isProd
  ? nodemailer.createTransport({
      host: env.smtp?.host,
      port: Number(env.smtp?.port ?? 587),
      secure: false,
      auth: env.smtp?.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true }); 

export async function sendMail({ to, subject, html, text }) {
  const from = env.mailFrom ?? 'no-reply@example.com';
  const info = await transport.sendMail({ from, to, subject, html, text });
  return info;
}

export function buildLink(pathWithQuery) {
  const base = env.appOrigin ?? `http://localhost:${env.port}`;
  return `${base}${pathWithQuery}`;
}

export default { sendMail, buildLink };
