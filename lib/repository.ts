import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { sampleCases, documentLibrary, type CaseRecord } from '@/data/domain';
import { env } from '@/lib/env';
import type { PortalInvite, UploadRecord } from '@/lib/types';

const appRoot = process.cwd();
const dataRoot = path.join(appRoot, 'data');
const invitesFile = path.join(dataRoot, 'invites.json');
const uploadsFile = path.join(dataRoot, 'uploads.json');

function ensureJsonFile(filePath: string, defaultValue: unknown) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  ensureJsonFile(filePath, fallback);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

export async function listCases(): Promise<CaseRecord[]> {
  return sampleCases;
}

export async function getCase(caseId: string): Promise<CaseRecord | undefined> {
  return sampleCases.find((item) => item.id === caseId);
}

export async function getCaseChecklist(caseId: string) {
  const caseRecord = await getCase(caseId);
  if (!caseRecord) return [];

  return documentLibrary.map((doc) => ({
    ...doc,
    required:
      (!doc.caseTypes || doc.caseTypes.includes(caseRecord.caseType)) &&
      (!doc.borrowerProfiles || doc.borrowerProfiles.some((profile) => caseRecord.borrowerProfiles.includes(profile))),
  }));
}

export async function createInvite(caseId: string): Promise<PortalInvite> {
  const caseRecord = await getCase(caseId);
  if (!caseRecord) throw new Error('Case not found');

  const invites = readJson<PortalInvite[]>(invitesFile, []);
  const token = crypto.randomBytes(18).toString('hex');
  const invite: PortalInvite = {
    token,
    caseId,
    leadName: caseRecord.leadName,
    phone: caseRecord.phone,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };

  invites.unshift(invite);
  writeJson(invitesFile, invites);
  return invite;
}

export async function getInvite(token: string): Promise<PortalInvite | undefined> {
  const invites = readJson<PortalInvite[]>(invitesFile, []);
  return invites.find((item) => item.token === token);
}

export async function saveUpload(input: Omit<UploadRecord, 'id' | 'uploadedAt'>) {
  const uploads = readJson<UploadRecord[]>(uploadsFile, []);
  const record: UploadRecord = {
    id: crypto.randomUUID(),
    uploadedAt: new Date().toISOString(),
    ...input,
  };
  uploads.unshift(record);
  writeJson(uploadsFile, uploads);
  return record;
}

export async function listUploads(caseId?: string) {
  const uploads = readJson<UploadRecord[]>(uploadsFile, []);
  return caseId ? uploads.filter((item) => item.caseId === caseId) : uploads;
}

export function getUploadDirectory() {
  return path.isAbsolute(env.uploadDir) ? env.uploadDir : path.join(appRoot, env.uploadDir);
}
