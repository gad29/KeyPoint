import { NextRequest, NextResponse } from 'next/server';
import { listCases, createCase } from '@/lib/repository';
import { hasAirtableConfig } from '@/lib/env';

export async function GET() {
  const cases = await listCases();

  return NextResponse.json({
    ok: true,
    source: hasAirtableConfig() ? 'airtable-or-fallback' : 'local-sample',
    data: cases,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const leadName = body?.leadName as string | undefined;
  const phone = body?.phone as string | undefined;
  const caseType = body?.caseType as string | undefined;
  const borrowerProfiles = Array.isArray(body?.borrowerProfiles) ? body.borrowerProfiles.map(String) : [];

  if (!leadName || !phone || !caseType || !borrowerProfiles.length) {
    return NextResponse.json(
      { ok: false, error: 'leadName, phone, caseType, and borrowerProfiles[] are required' },
      { status: 400 },
    );
  }

  const result = await createCase({
    leadName,
    spouseName: body?.spouseName ? String(body.spouseName) : undefined,
    phone,
    email: body?.email ? String(body.email) : undefined,
    caseType,
    borrowerProfiles,
    assignedTo: body?.assignedTo ? String(body.assignedTo) : undefined,
    notes: body?.notes ? String(body.notes) : undefined,
    filloutSubmissionId: body?.filloutSubmissionId ? String(body.filloutSubmissionId) : undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
