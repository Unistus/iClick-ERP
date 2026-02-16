'use server';

import nodemailer from 'nodemailer';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}

interface SendEmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
  smtp: SmtpConfig;
}

/**
 * Server action to send emails via SMTP using institutional credentials.
 */
export async function sendEmail({ to, from, subject, html, smtp }: SendEmailParams) {
  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure || smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${from}" <${smtp.user}>`,
      to,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('SMTP Error:', error);
    return { success: false, error: error.message };
  }
}
