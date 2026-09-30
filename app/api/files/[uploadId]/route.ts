import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/data';
import { readStoredFile } from '@/lib/storage';

/** Staff-only (enforced in middleware). Files are always served as downloads, never rendered inline. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params;
  const upload = await getStore().getUpload(uploadId);
  if (!upload) return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });

  const file = await readStoredFile(upload.path);
  if (!file.ok) return NextResponse.json({ ok: false, error: file.error }, { status: 404 });
  if (file.kind === 'redirect') return NextResponse.redirect(file.url);

  const asciiName = upload.fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(upload.fileName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
