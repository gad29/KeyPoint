import { NextRequest, NextResponse } from 'next/server';
import { getCase, updateCase } from '@/lib/repository';
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

  const result = await updateCase(caseId, {
    stage,
    assignedTo: typeof body?.assignedTo === 'string' ? body.assignedTo : undefined,
    notesAppend: typeof body?.notesAppend === 'string' ? body.notesAppend : undefined,
    portalStatus: typeof body?.portalStatus === 'string' ? body.portalStatus : undefined,
    nextAction: typeof body?.nextAction === 'string' ? body.nextAction : undefined,
    missingItemsCount: typeof body?.missingItemsCount === 'number' ? body.missingItemsCount : undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
