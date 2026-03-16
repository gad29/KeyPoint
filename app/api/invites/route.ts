import { NextRequest, NextResponse } from 'next/server';
import { createInvite } from '@/lib/repository';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const caseId = body?.caseId as string | undefined;

  if (!caseId) {
    return NextResponse.json({ ok: false, error: 'caseId is required' }, { status: 400 });
  }

  try {
    const invite = await createInvite(caseId);
    return NextResponse.json({
      ok: true,
      data: invite,
      portalUrl: `${env.appBaseUrl}/invite/${invite.token}`,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
