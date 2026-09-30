import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env, hasSupabaseStorageConfig } from '@/lib/env';

/**
 * Stored paths are backend-tagged: "local:<file>" or "supabase:<object key>".
 * Older records may hold an absolute disk path or a public URL; readStoredFile handles both.
 */
export type ReadResult =
  | { ok: true; kind: 'bytes'; bytes: Buffer }
  | { ok: true; kind: 'redirect'; url: string }
  | { ok: false; error: string };

export function uploadDirectory() {
  return path.isAbsolute(env.uploadDir) ? env.uploadDir : path.join(process.cwd(), env.uploadDir);
}

function safeFileName(original: string) {
  const cleaned = original.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'file';
  return `${crypto.randomUUID()}-${cleaned}`;
}

function supabaseHeaders(contentType?: string) {
  const key = env.supabaseServiceRoleKey || '';
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
    ...(contentType ? { 'Content-Type': contentType } : {}),
  };
}

function supabaseBase() {
  return `${(env.supabaseUrl || '').replace(/\/$/, '')}/storage/v1`;
}

export async function storeFile(caseId: string, originalName: string, bytes: Buffer, contentType: string) {
  const name = safeFileName(originalName);

  if (hasSupabaseStorageConfig()) {
    const key = `${caseId.replace(/[^a-zA-Z0-9-]/g, '_')}/${name}`;
    const res = await fetch(`${supabaseBase()}/object/${env.supabaseStorageBucket}/${key}`, {
      method: 'POST',
      headers: { ...supabaseHeaders(contentType || 'application/octet-stream'), 'x-upsert': 'false' },
      body: new Uint8Array(bytes),
    });
    if (!res.ok) return { ok: false as const, error: `Storage upload failed (${res.status})` };
    return { ok: true as const, storagePath: `supabase:${key}` };
  }

  const dir = uploadDirectory();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), bytes);
  return { ok: true as const, storagePath: `local:${name}` };
}

function readLocal(fileName: string): ReadResult {
  const dir = path.resolve(uploadDirectory());
  const full = path.resolve(dir, fileName);
  if (full !== dir && !full.startsWith(dir + path.sep)) return { ok: false, error: 'Invalid file path' };
  if (!fs.existsSync(full)) return { ok: false, error: 'File not found' };
  return { ok: true, kind: 'bytes', bytes: fs.readFileSync(full) };
}

export async function readStoredFile(storedPath: string): Promise<ReadResult> {
  if (storedPath.startsWith('local:')) return readLocal(storedPath.slice('local:'.length));

  if (storedPath.startsWith('supabase:')) {
    if (!hasSupabaseStorageConfig()) return { ok: false, error: 'Supabase Storage is not configured' };
    const key = storedPath.slice('supabase:'.length);
    const res = await fetch(`${supabaseBase()}/object/sign/${env.supabaseStorageBucket}/${key}`, {
      method: 'POST',
      headers: supabaseHeaders('application/json'),
      body: JSON.stringify({ expiresIn: 300 }),
    });
    if (!res.ok) return { ok: false, error: `Could not sign download (${res.status})` };
    const json = (await res.json()) as { signedURL?: string };
    if (!json.signedURL) return { ok: false, error: 'Storage did not return a download URL' };
    return { ok: true, kind: 'redirect', url: `${supabaseBase()}${json.signedURL}` };
  }

  if (/^https?:\/\//.test(storedPath)) return { ok: true, kind: 'redirect', url: storedPath };

  // Legacy absolute path: only serve it if it lives inside the upload directory.
  return readLocal(path.relative(path.resolve(uploadDirectory()), path.resolve(storedPath)));
}
