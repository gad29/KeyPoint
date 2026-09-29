import { NextRequest, NextResponse } from 'next/server';
import { currentRequestHasStaffSession } from '@/lib/staff-session';
import { getPrimaryBillingAdapter, listConfiguredBillingAdapters } from '@/lib/billing';
import { env } from '@/lib/env';

export async function GET() {
  if (!(await currentRequestHasStaffSession())) {
    return NextResponse.json({ ok: false, error: 'Staff sign-in required' }, { status: 401 });
  }

  const providers = listConfiguredBillingAdapters().map((adapter) => adapter.id);
  return NextResponse.json({
    ok: true,
    data: [],
    meta: {
      currency: env.currency,
      providers,
      primaryProvider: getPrimaryBillingAdapter()?.id ?? null,
      note: 'Invoice storage lands in Phase 4. This endpoint returns an empty list today.',
    },
  });
}

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

  const adapter = getPrimaryBillingAdapter();
  if (!adapter) {
    return NextResponse.json(
      { ok: false, error: 'No billing provider configured. Add Stripe / iCount / Green Invoice credentials in settings.' },
      { status: 501 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: `Adapter '${adapter.id}' create-invoice not implemented yet (Phase 4).`,
      meta: { received: body },
    },
    { status: 501 },
  );
}
