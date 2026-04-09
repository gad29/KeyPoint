import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { env, isProductionLike } from '@/lib/env';

export const OFFICE_AUTH_COOKIE = 'keypoint-office-session';
const DEFAULT_SESSION_HOURS = 12;
const encoder = new TextEncoder();

function base64url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function decodeBase64url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function getSessionSecret() {
  return env.officeSessionSecret || env.portalInviteSecret || env.officeAccessCode || 'keypoint-office';
}

async function signOfficePayload(encodedPayload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload));
  return Buffer.from(signature).toString('base64url');
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

function getSessionHours() {
  const parsed = Number(env.officeSessionHours || DEFAULT_SESSION_HOURS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_HOURS;
}

export function isOfficeAuthEnabled() {
  return Boolean(env.officeAccessCode?.trim());
}

export function verifyOfficeAccessCode(code: string) {
  return Boolean(env.officeAccessCode && code === env.officeAccessCode);
}

export async function createOfficeSessionToken() {
  const payload = {
    scope: 'office',
    expiresAt: new Date(Date.now() + getSessionHours() * 60 * 60 * 1000).toISOString(),
  };

  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = await signOfficePayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function parseOfficeSessionToken(token: string | undefined | null) {
  if (!token) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = await signOfficePayload(encodedPayload);
  if (!constantTimeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(decodeBase64url(encodedPayload)) as { scope?: string; expiresAt?: string };
    if (payload.scope !== 'office' || !payload.expiresAt) return null;
    if (new Date(payload.expiresAt).getTime() < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requestHasOfficeSession(request: NextRequest) {
  if (!isOfficeAuthEnabled()) return true;
  return Boolean(await parseOfficeSessionToken(request.cookies.get(OFFICE_AUTH_COOKIE)?.value));
}

export async function currentRequestHasOfficeSession() {
  if (!isOfficeAuthEnabled()) return true;
  const cookieStore = await cookies();
  return Boolean(await parseOfficeSessionToken(cookieStore.get(OFFICE_AUTH_COOKIE)?.value));
}

export function officeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProductionLike(),
    path: '/',
    maxAge: getSessionHours() * 60 * 60,
  };
}
