import { NextRequest, NextResponse } from 'next/server';
import { createOfficeSessionToken, isOfficeAuthEnabled, officeCookieOptions, verifyOfficeAccessCode, OFFICE_AUTH_COOKIE } from '@/lib/office-auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code.trim() : '';

  if (!isOfficeAuthEnabled()) {
    return NextResponse.json({ ok: true, disabled: true });
  }

  if (!code || !verifyOfficeAccessCode(code)) {
    return NextResponse.json({ ok: false, error: 'Incorrect office access code' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(OFFICE_AUTH_COOKIE, await createOfficeSessionToken(), officeCookieOptions());
  return response;
}
