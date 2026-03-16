import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getUploadDirectory, saveUpload } from '@/lib/repository';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');
  const caseId = formData.get('caseId')?.toString();
  const documentCode = formData.get('documentCode')?.toString();

  if (!(file instanceof File) || !caseId || !documentCode) {
    return NextResponse.json({ ok: false, error: 'file, caseId and documentCode are required' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const uploadDir = getUploadDirectory();
  fs.mkdirSync(uploadDir, { recursive: true });
  const outputPath = path.join(uploadDir, safeName);
  fs.writeFileSync(outputPath, bytes);

  const record = await saveUpload({
    caseId,
    documentCode,
    fileName: file.name,
    path: outputPath,
  });

  return NextResponse.json({ ok: true, data: record });
}
