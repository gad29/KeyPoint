import { NextRequest, NextResponse } from 'next/server';
import { caseIdFromClientToken, getCase, saveUpload } from '@/lib/repository';
import { currentRequestHasStaffSession } from '@/lib/staff-session';
import { storeFile } from '@/lib/storage';
import { env } from '@/lib/env';

const DOC_CODE_RE = /^[a-z0-9][a-z0-9-]{0,48}$/;

/**
 * Accepts a file for a case. Callers prove access with either the client's signed
 * portal token (issued at intake / by the office) or a staff session.
 */
export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'Expected multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const caseId = formData.get('caseId')?.toString().trim();
  const documentCode = formData.get('documentCode')?.toString().trim().toLowerCase();
  const token = formData.get('token')?.toString();

  if (!(file instanceof File) || !caseId || !documentCode) {
    return NextResponse.json({ ok: false, error: 'file, caseId and documentCode are required' }, { status: 400 });
  }
  if (!DOC_CODE_RE.test(documentCode)) {
    return NextResponse.json({ ok: false, error: 'Invalid documentCode' }, { status: 400 });
  }

  const tokenCaseId = token ? caseIdFromClientToken(token) : null;
  const authorized = tokenCaseId === caseId || (await currentRequestHasStaffSession());
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'A valid client link or staff sign-in is required' }, { status: 401 });
  }

  const existingCase = await getCase(caseId);
  if (!existingCase) {
    return NextResponse.json({ ok: false, error: 'Unknown caseId' }, { status: 404 });
  }

  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: 'Empty file' }, { status: 400 });
  }
  if (file.size > env.uploadMaxFileBytes) {
    return NextResponse.json({ ok: false, error: `File too large (max ${env.uploadMaxFileBytes} bytes)` }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await storeFile(caseId, file.name, bytes, file.type);
  if (!stored.ok) {
    return NextResponse.json({ ok: false, error: stored.error }, { status: 502 });
  }

  const record = await saveUpload({
    caseId,
    documentCode,
    fileName: file.name.slice(0, 200),
    path: stored.storagePath,
  });

  return NextResponse.json({ ok: true, data: { id: record.id, documentCode, fileName: record.fileName, uploadedAt: record.uploadedAt } });
}
