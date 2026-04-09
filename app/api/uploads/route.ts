import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCase, getUploadDirectory, saveUpload } from '@/lib/repository';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');
  const caseId = formData.get('caseId')?.toString();
  const documentCode = formData.get('documentCode')?.toString();

  if (!(file instanceof File) || !caseId || !documentCode) {
    return NextResponse.json({ ok: false, error: 'file, caseId and documentCode are required' }, { status: 400 });
  }

  const existingCase = await getCase(caseId);
  if (!existingCase) {
    return NextResponse.json({ ok: false, error: 'Unknown caseId' }, { status: 404 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ ok: false, error: 'Empty file' }, { status: 400 });
  }
  if (bytes.length > env.uploadMaxFileBytes) {
    return NextResponse.json(
      { ok: false, error: `File too large (max ${env.uploadMaxFileBytes} bytes)` },
      { status: 413 },
    );
  }
  const safeName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const uploadDir = getUploadDirectory();
  fs.mkdirSync(uploadDir, { recursive: true });
  const outputPath = path.join(uploadDir, safeName);
  fs.writeFileSync(outputPath, bytes);

  const publicPath = env.uploadPublicBaseUrl
    ? `${env.uploadPublicBaseUrl.replace(/\/$/, '')}/${safeName}`
    : outputPath;

  const record = await saveUpload({
    caseId,
    documentCode,
    fileName: file.name,
    path: publicPath,
  });

  return NextResponse.json({ ok: true, data: record });
}
