import { NextResponse } from 'next/server';
import { getStore } from '@/lib/data';

/** Staff-only (middleware). Signature summaries for the case page; the full record is on the print view. */
export async function GET(_req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const result = await getStore().listContractSignatures(caseId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  return NextResponse.json({
    ok: true,
    data: (result.data ?? []).map((s) => ({ id: s.id, title: s.contractTitle, signerName: s.signerName, signedAt: s.signedAt, contentHash: s.contentHash })),
  });
}
