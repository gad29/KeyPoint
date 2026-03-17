import { NextRequest, NextResponse } from 'next/server';
import { getCase, setCaseStage } from '@/lib/repository';
import type { CaseStage } from '@/data/domain';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const record = await getCase(caseId);
  if (!record) {
    return NextResponse.json({ ok: false, error: 'Case not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: record });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const body = await req.json();
  const stage = body?.stage as CaseStage | undefined;

  if (!stage) {
    return NextResponse.json({ ok: false, error: 'stage is required' }, { status: 400 });
  }

  const result = await setCaseStage(caseId, stage);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
