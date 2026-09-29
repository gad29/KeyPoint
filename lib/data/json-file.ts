import fs from 'node:fs';
import path from 'node:path';
import type { UploadRecord } from '@/lib/types';

export const dataRoot = path.join(process.cwd(), 'data');

export function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  try {
    fs.renameSync(tmp, filePath);
  } catch {
    fs.copyFileSync(tmp, filePath);
    fs.unlinkSync(tmp);
  }
}

const uploadsFile = path.join(dataRoot, 'uploads.json');

export function appendUploadToFile(record: UploadRecord) {
  const uploads = readJson<UploadRecord[]>(uploadsFile, []);
  uploads.unshift(record);
  writeJson(uploadsFile, uploads);
}

export function readUploadsFromFile(caseId?: string) {
  const uploads = readJson<UploadRecord[]>(uploadsFile, []);
  return caseId ? uploads.filter((item) => item.caseId === caseId) : uploads;
}
