import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorFinanceAccess } from '@/lib/admin-auth';
import { logBillingEventToAirtable } from '@/lib/airtable-finance';
import { triggerN8n } from '@/lib/n8n';

const KIND_TO_PATH: Record<string, string> = {
  invoice: 'keypoint/advisor/invoice',
  receipt: 'keypoint/advisor/receipt',
  reminder: 'keypoint/advisor/payment-reminder',
};

export async function POST(req: NextRequest) {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  let body: {
    kind?: string;
    targetEmail?: string;
    caseId?: string;
    amount?: number;
    dueDate?: string;
    message?: string;
    clientName?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const kind = typeof body.kind === 'string' ? body.kind.trim().toLowerCase() : '';
  const path = KIND_TO_PATH[kind];
  if (!path) {
    return NextResponse.json({ ok: false, error: 'kind must be invoice, receipt, or reminder' }, { status: 400 });
  }

  const targetEmail = typeof body.targetEmail === 'string' ? body.targetEmail.trim() : '';
  if (!targetEmail || !/^\S+@\S+\.\S+$/.test(targetEmail)) {
    return NextResponse.json({ ok: false, error: 'Valid targetEmail is required' }, { status: 400 });
  }

  const payload = {
    kind,
    targetEmail,
    caseId: body.caseId?.trim() || undefined,
    amount: typeof body.amount === 'number' && Number.isFinite(body.amount) ? body.amount : undefined,
    dueDate: body.dueDate?.trim() || undefined,
    message: body.message?.trim() || undefined,
    clientName: body.clientName?.trim() || undefined,
    requestedAt: new Date().toISOString(),
    requestedBy: gate.session.email,
  };

  const n8n = await triggerN8n(path, payload);
  const log = await logBillingEventToAirtable({
    kind,
    targetEmail,
    caseId: payload.caseId,
    amount: payload.amount,
    notes: n8n.ok ? 'n8n accepted' : `n8n error: ${n8n.error || 'unknown'}`,
    triggeredByEmail: gate.session.email,
  });

  if (!n8n.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: n8n.error || 'n8n request failed',
        meta: { airtableLogOk: log.ok },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    meta: { airtableLogOk: log.ok, airtableLogError: log.ok ? undefined : log.error },
  });
}
