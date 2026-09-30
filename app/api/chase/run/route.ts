import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { currentRequestHasStaffSession } from '@/lib/staff-session';
import { runChase } from '@/lib/billing/service';

function hasCronSecret(req: NextRequest) {
  if (!env.cronSecret) return false;
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"; n8n can send either header.
  const given = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-cron-secret') || '';
  const a = Buffer.from(given);
  const b = Buffer.from(env.cronSecret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handle(req: NextRequest) {
  if (!hasCronSecret(req) && !(await currentRequestHasStaffSession())) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const summary = await runChase();
  console.info(`[AgencyOS Chase] ${JSON.stringify(summary)}`);
  return NextResponse.json({ ok: true, data: summary });
}

/** Daily reminder pass. Vercel Cron uses GET; n8n or the "Run now" button use POST. */
export const GET = handle;
export const POST = handle;
