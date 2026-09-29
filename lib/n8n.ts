import { env } from '@/lib/env';

const WEBHOOK_TIMEOUT_MS = 8000;

/**
 * Never throws: automation webhooks are side effects, and an unreachable n8n
 * must not fail the user-facing request that already saved its data.
 */
export async function postJson(url: string, payload: unknown) {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause?.code;
    const message = cause || (error instanceof Error ? error.message : 'unknown error');
    return { ok: false, error: `Webhook unreachable: ${message}` } as const;
  }

  if (!res.ok) {
    return { ok: false, error: `Webhook failed with ${res.status}` } as const;
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!contentType.includes('application/json')) return { ok: true, data: text } as const;
  try {
    return { ok: true, data: text.trim() ? JSON.parse(text) : null } as const;
  } catch {
    return { ok: true, data: text } as const;
  }
}

export async function triggerN8n(pathname: string, payload: unknown) {
  if (!env.n8nWebhookBaseUrl) {
    return { ok: false, error: 'N8N webhook base URL is not configured' } as const;
  }

  const url = `${env.n8nWebhookBaseUrl.replace(/\/$/, '')}/${pathname.replace(/^\//, '')}`;
  return postJson(url, payload);
}
