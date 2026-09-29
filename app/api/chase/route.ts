import { NextRequest, NextResponse } from 'next/server';
import { currentRequestHasStaffSession } from '@/lib/staff-session';
import { defaultChaseCadence } from '@/data/domain';
import { triggerN8n } from '@/lib/n8n';
import { env } from '@/lib/env';

export async function GET() {
  if (!(await currentRequestHasStaffSession())) {
    return NextResponse.json({ ok: false, error: 'Staff sign-in required' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      cadence: defaultChaseCadence,
      runs: [],
    },
    meta: {
      note: 'Chase engine lands in Phase 4. This endpoint currently returns the default cadence + an empty run list.',
    },
  });
}

/**
 * One-click chase: an office user hits this to trigger the "next" chase step
 * for an invoice. Phase 4 will pick up the next step, draft the email via
 * Claude, send it, and log a ChaseRun. Today it forwards to n8n if configured.
 */
export async function POST(req: NextRequest) {
  if (!(await currentRequestHasStaffSession())) {
    return NextResponse.json({ ok: false, error: 'Staff sign-in required' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const invoiceId = typeof body.invoiceId === 'string' ? body.invoiceId : '';
  if (!invoiceId) {
    return NextResponse.json({ ok: false, error: 'invoiceId is required' }, { status: 400 });
  }

  if (env.n8nWebhookBaseUrl) {
    const forwarded = await triggerN8n('agency-os/invoice-chase', {
      invoiceId,
      requestedAt: new Date().toISOString(),
    });
    if (!forwarded.ok) {
      return NextResponse.json({ ok: false, error: forwarded.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, data: { invoiceId, forwardedToN8n: true } });
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'Chase engine not implemented yet (Phase 4) and no n8n webhook base URL configured.',
    },
    { status: 501 },
  );
}
