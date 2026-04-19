import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { env, isProductionLike } from '@/lib/env';
import { normalizeStaffRole } from '@/lib/staff-roles';

export const STAFF_AUTH_COOKIE = 'keypoint-staff-session';
const DEFAULT_SESSION_HOURS = 12;
const encoder = new TextEncoder();

function base64url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function decodeBase64url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function getStaffSessionSecret() {
  return (
    env.staffSessionSecret ||
    env.officeSessionSecret ||
    env.portalInviteSecret ||
    'keypoint-staff-change-me'
  );
}

async function signPayload(encodedPayload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getStaffSessionSecret()),
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
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function getSessionHours() {
  const parsed = Number(env.officeSessionHours || DEFAULT_SESSION_HOURS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_HOURS;
}

export type StaffSessionPayload = {
  scope: 'staff';
  email: string;
  recordId: string;
  expiresAt: string;
  /** Lowercase role from Airtable Staff (e.g. advisor, admin, secretary). */
  role: string;
};

export async function createStaffSessionToken(payload: Pick<StaffSessionPayload, 'email' | 'recordId' | 'role'>) {
  const role = normalizeStaffRole(payload.role);
  const full: StaffSessionPayload = {
    scope: 'staff',
    email: payload.email,
    recordId: payload.recordId,
    role,
    expiresAt: new Date(Date.now() + getSessionHours() * 60 * 60 * 1000).toISOString(),
  };
  const encodedPayload = base64url(JSON.stringify(full));
  const signature = await signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function parseStaffSessionToken(token: string | undefined | null): Promise<StaffSessionPayload | null> {
  if (!token) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;
  const expectedSignature = await signPayload(encodedPayload);
  if (!constantTimeEqual(signature, expectedSignature)) return null;
  try {
    const raw = JSON.parse(decodeBase64url(encodedPayload)) as StaffSessionPayload & { role?: string };
    if (raw.scope !== 'staff' || !raw.email || !raw.recordId || !raw.expiresAt) return null;
    if (new Date(raw.expiresAt).getTime() < Date.now()) return null;
    const payload: StaffSessionPayload = {
      ...raw,
      role: normalizeStaffRole(raw.role),
    };
    return payload;
  } catch {
    return null;
  }
}

export async function requestHasStaffSession(request: NextRequest) {
  return Boolean(await parseStaffSessionToken(request.cookies.get(STAFF_AUTH_COOKIE)?.value));
}

export async function getStaffSessionFromRequest(request: NextRequest) {
  return parseStaffSessionToken(request.cookies.get(STAFF_AUTH_COOKIE)?.value);
}

export async function currentRequestHasStaffSession() {
  const cookieStore = await cookies();
  return Boolean(await parseStaffSessionToken(cookieStore.get(STAFF_AUTH_COOKIE)?.value));
}

export async function getCurrentStaffFromCookies() {
  const cookieStore = await cookies();
  return parseStaffSessionToken(cookieStore.get(STAFF_AUTH_COOKIE)?.value);
}

export function staffCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProductionLike(),
    path: '/',
    maxAge: getSessionHours() * 60 * 60,
  };
}
