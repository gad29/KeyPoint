import { NextRequest, NextResponse } from 'next/server';
import { approveChaseRun, skipChaseRun } from '@/lib/billing/service';

/** Staff-only (middleware). { action: 'approve', channel: 'email'|'whatsapp'|'manual', subject?, body? } | { action: 'skip' } */
export async function POST(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  let body: { action?: string; channel?: string; subject?: string; body?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {}

  if (body.action === 'skip') {
    const skipped = await skipChaseRun(runId);
    return skipped.ok ? NextResponse.json({ ok: true, data: skipped.data }) : NextResponse.json({ ok: false, error: skipped.error }, { status: 400 });
  }
  if (body.action === 'approve') {
    const channel = body.channel === 'email' || body.channel === 'whatsapp' ? body.channel : 'manual';
    const approved = await approveChaseRun(runId, channel, { subject: body.subject, body: body.body });
    return approved.ok ? NextResponse.json({ ok: true, data: approved.data }) : NextResponse.json({ ok: false, error: approved.error }, { status: 400 });
  }
  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
