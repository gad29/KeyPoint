import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { env, isProductionLike } from '@/lib/env';
import { requestHasOfficeSession } from '@/lib/office-auth';

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function authorizeN8nForwarder(req: NextRequest): Promise<{ ok: true } | { ok: false; message: string }> {
  if (await requestHasOfficeSession(req)) {
    return { ok: true };
  }

  const secret = env.n8nForwarderSecret?.trim();
  if (secret) {
    const header = req.headers.get('x-keypoint-forwarder-secret') || '';
    if (timingSafeEqualString(header, secret)) {
      return { ok: true };
    }
    return { ok: false, message: 'Invalid or missing x-keypoint-forwarder-secret' };
  }

  if (isProductionLike()) {
    return {
      ok: false,
      message: 'Set N8N_FORWARDER_SECRET and send it as x-keypoint-forwarder-secret, or sign in to the office',
    };
  }

  return { ok: true };
}
