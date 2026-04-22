import { NextResponse } from 'next/server';
import { listCaseDocuments, updateCaseDocumentStatus } from '@/lib/repository';

export async function GET(_req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const docs = await listCaseDocuments(caseId);
  return NextResponse.json({ ok: true, data: docs });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  let body: { documentCode?: string; status?: string; reviewNote?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { documentCode, status, reviewNote } = body;
  if (!documentCode || !status) {
    return NextResponse.json({ ok: false, error: 'documentCode and status are required' }, { status: 400 });
  }

  const validStatuses = ['not-uploaded', 'uploaded', 'under-review', 'approved', 'resubmit-needed', 'not-applicable'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ ok: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  const result = await updateCaseDocumentStatus(caseId, documentCode, status, reviewNote);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
