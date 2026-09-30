import { canSendEmailDirectly, env, looksLikePlaceholder } from '@/lib/env';
import { postJson } from '@/lib/n8n';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export type EmailResult = { ok: true; via: 'resend' | 'webhook'; id?: string } | { ok: false; error: string; notConfigured?: boolean };

function hasEmailWebhook() {
  return Boolean(env.emailProviderWebhookUrl && !looksLikePlaceholder(env.emailProviderWebhookUrl));
}

export function canSendEmail() {
  return canSendEmailDirectly() || hasEmailWebhook();
}

function textToHtml(text: string) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const linked = escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  return `<div dir="auto" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;white-space:pre-wrap">${linked}</div>`;
}

/** Sends through Resend (EMAIL_PROVIDER=resend) or the email webhook; never throws. */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (!/^\S+@\S+\.\S+$/.test(message.to)) return { ok: false, error: 'Invalid recipient email' };

  if (canSendEmailDirectly()) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.emailApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.emailFromAddress,
          to: [message.to],
          reply_to: env.emailReplyTo || undefined,
          subject: message.subject,
          text: message.text,
          html: textToHtml(message.text),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const json = (await res.json()) as { id?: string; message?: string };
      if (!res.ok) return { ok: false, error: json.message || `Email provider error ${res.status}` };
      return { ok: true, via: 'resend', id: json.id };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Email request failed' };
    }
  }

  if (hasEmailWebhook()) {
    const result = await postJson(env.emailProviderWebhookUrl as string, {
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: textToHtml(message.text),
      from: env.emailFromAddress || undefined,
      replyTo: env.emailReplyTo || undefined,
    });
    return result.ok ? { ok: true, via: 'webhook' } : { ok: false, error: result.error };
  }

  return { ok: false, error: 'Email sending is not configured', notConfigured: true };
}
