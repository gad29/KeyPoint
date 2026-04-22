import { NextResponse } from 'next/server';
import { findCaseByApplicantIdNumber } from '@/lib/airtable';

/**
 * Public endpoint used by the intake form to detect whether the entered
 * national ID already belongs to an open case. Deliberately returns minimal
 * information so an unauthenticated guess only reveals "a case exists" + the
 * owner's first name and stage (which the returning client already knows).
 */
export async function POST(req: Request) {
  let body: { idNumber?: string };
  try {
    body = (await req.json()) as { idNumber?: string };
  } catch {
    return NextResponse.json({ found: false });
  }

  if (!body.idNumber || typeof body.idNumber !== 'string') {
    return NextResponse.json({ found: false });
  }

  const normalized = body.idNumber.replace(/\D/g, '');
  if (normalized.length < 7) return NextResponse.json({ found: false });

  try {
    const result = await findCaseByApplicantIdNumber(normalized);
    if (!result.ok || !result.data) return NextResponse.json({ found: false });

    return NextResponse.json({
      found: true,
      caseId: result.data.caseId,
      leadName: result.data.leadName,
      stage: result.data.stage,
    });
  } catch {
    return NextResponse.json({ found: false });
  }
}
