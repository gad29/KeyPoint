import { NextRequest, NextResponse } from 'next/server';
import { createBankOffer, listBankOffers } from '@/lib/repository';
import type { BankOffer } from '@/data/domain';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const offers = await listBankOffers(caseId);
  return NextResponse.json({ ok: true, data: offers });
}

function isOfferStatus(value: unknown): value is BankOffer['status'] {
  return value === 'not-started' || value === 'requested' || value === 'received' || value === 'expired';
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const body = await req.json();

  if (typeof body?.bank !== 'string' || !body.bank.trim()) {
    return NextResponse.json({ ok: false, error: 'bank is required' }, { status: 400 });
  }

  if (!isOfferStatus(body?.status)) {
    return NextResponse.json({ ok: false, error: 'valid offer status is required' }, { status: 400 });
  }

  const result = await createBankOffer({
    caseId,
    bank: body.bank.trim(),
    status: body.status,
    firstPayment: typeof body?.firstPayment === 'string' ? body.firstPayment : undefined,
    maxPayment: typeof body?.maxPayment === 'string' ? body.maxPayment : undefined,
    totalRepayment: typeof body?.totalRepayment === 'string' ? body.totalRepayment : undefined,
    expiresAt: typeof body?.expiresAt === 'string' ? body.expiresAt : undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
