'use client';

import { Firestore, doc, getDoc } from 'firebase/firestore';
import { sendEmail as serverSendEmail } from '@/app/actions/email';

interface EmailPayload {
  to: string;
  templateId: string;
  tags: Record<string, string>;
}

/**
 * Transactional Email Service for iClick ERP.
 * Orchestrates template fetching, tag parsing, and SMTP delivery.
 */
export async function sendTransactionalEmail(
  db: Firestore, 
  institutionId: string, 
  payload: EmailPayload
) {
  try {
    // 1. Fetch SMTP Settings
    const settingsRef = doc(db, 'institutions', institutionId, 'settings', 'global');
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) throw new Error("Institution settings not found.");
    const settings = settingsSnap.data();
    const comms = settings.comms;

    if (!comms || !comms.smtpHost || !comms.smtpUser) {
      throw new Error("SMTP configuration is incomplete for this institution.");
    }

    // 2. Fetch Template
    const templateRef = doc(db, 'institutions', institutionId, 'notification_templates', payload.templateId);
    const templateSnap = await getDoc(templateRef);

    if (!templateSnap.exists()) throw new Error(`Template '${payload.templateId}' not found.`);
    const template = templateSnap.data();

    // 3. Parse Content
    let html = template.content;
    let subject = template.subject || "ERP Notification";

    // Replace tags using regex: {{tag}}
    Object.entries(payload.tags).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
      subject = subject.replace(regex, value);
    });

    // 4. Trigger Server Action
    const result = await serverSendEmail({
      to: payload.to,
      from: comms.emailFromAddress || settings.name || "iClick ERP",
      subject,
      html: html.replace(/\n/g, '<br>'), // Simple plain text to HTML conversion
      smtp: {
        host: comms.smtpHost,
        port: parseInt(comms.smtpPort),
        user: comms.smtpUser,
        pass: comms.smtpPass,
        secure: comms.smtpSecure
      }
    });

    return result;
  } catch (err: any) {
    console.error("Email Service Failure:", err);
    return { success: false, error: err.message };
  }
}
