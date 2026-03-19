import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { sampleCases, documentLibrary, type CaseRecord, type CaseStage } from '@/data/domain';
import { env, hasAirtableConfig } from '@/lib/env';
import {
  createAirtableActivityLog,
  createAirtableCase,
  createAirtableCaseDocument,
  getAirtableCaseByCaseId,
  listAirtableCases,
  updateAirtableCaseStage,
  updateAirtablePortalStatus,
} from '@/lib/airtable';
import { triggerN8n } from '@/lib/n8n';
import type { CreateCaseInput, PortalInvite, UploadRecord } from '@/lib/types';

const appRoot = process.cwd();
const dataRoot = path.join(appRoot, 'data');
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

function base64url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function decodeBase64url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signInvitePayload(encodedPayload: string) {
  return crypto.createHmac('sha256', env.portalInviteSecret).update(encodedPayload).digest('base64url');
}

function makeInviteToken(caseRecord: CaseRecord) {
  const payload = {
    caseId: caseRecord.id,
    leadName: caseRecord.leadName,
    phone: caseRecord.phone,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  } satisfies Omit<PortalInvite, 'token'>;

  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = signInvitePayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseInviteToken(token: string): Omit<PortalInvite, 'token'> | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signInvitePayload(encodedPayload);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

  try {
    const payload = JSON.parse(decodeBase64url(encodedPayload)) as Omit<PortalInvite, 'token'>;
    if (!payload.caseId || !payload.leadName || !payload.phone || !payload.expiresAt) return null;
    if (new Date(payload.expiresAt).getTime() < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function listCases(): Promise<CaseRecord[]> {
  if (!hasAirtableConfig()) return sampleCases;

  const airtable = await listAirtableCases();
  if (airtable.ok && airtable.data?.length) {
    return airtable.data;
  }

  return sampleCases;
}

export async function getCase(caseId: string): Promise<CaseRecord | undefined> {
  if (hasAirtableConfig()) {
    const airtable = await getAirtableCaseByCaseId(caseId);
    if (airtable.ok && airtable.data) return airtable.data;
  }

  return sampleCases.find((item) => item.id === caseId);
}

export async function createCase(input: CreateCaseInput) {
  if (!hasAirtableConfig()) {
    return { ok: false, error: 'Airtable must be configured to create live cases' } as const;
  }

  const created = await createAirtableCase(input);
  if (!created.ok || !created.data) return created;

  await createAirtableActivityLog(created.data.id, 'case-created', 'Case created from KeyPoint app');
  return created;
}

export async function setCaseStage(caseId: string, stage: CaseStage) {
  if (!hasAirtableConfig()) {
    return { ok: false, error: 'Airtable must be configured to update case stage' } as const;
  }

  const updated = await updateAirtableCaseStage(caseId, stage);
  if (updated.ok) {
    await createAirtableActivityLog(caseId, 'stage-updated', `Case stage changed to ${stage}`);
  }
  return updated;
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

  const token = makeInviteToken(caseRecord);
  const parsed = parseInviteToken(token);
  if (!parsed) throw new Error('Failed to create invite token');

  if (hasAirtableConfig()) {
    await updateAirtablePortalStatus(caseId, 'invited');
    await createAirtableActivityLog(caseId, 'portal-invite-generated', 'Portal invite link generated');
  }

  return { token, ...parsed };
}

export async function getInvite(token: string): Promise<PortalInvite | undefined> {
  const parsed = parseInviteToken(token);
  if (!parsed) return undefined;

  const caseRecord = await getCase(parsed.caseId);
  if (!caseRecord) return undefined;

  return {
    token,
    caseId: caseRecord.id,
    leadName: caseRecord.leadName,
    phone: caseRecord.phone,
    expiresAt: parsed.expiresAt,
  };
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

  let caseDocumentRecordId = '';
  if (hasAirtableConfig()) {
    const createdDocument = await createAirtableCaseDocument(record.caseId, record.documentCode, record.path);
    caseDocumentRecordId = createdDocument.ok && createdDocument.data?.id ? createdDocument.data.id : '';
    await createAirtableActivityLog(record.caseId, 'document-uploaded', `${record.fileName} uploaded for ${record.documentCode}`);
  }

  if (env.n8nWebhookBaseUrl) {
    const caseRecord = await getCase(record.caseId);
    await triggerN8n('keypoint/document-upload', {
      caseDocumentRecordId,
      caseId: record.caseId,
      documentCode: record.documentCode,
      fileName: record.fileName,
      fileUrl: record.path,
      uploadedAt: record.uploadedAt,
      path: record.path,
      phone: caseRecord?.phone || '',
    });
  }

  return record;
}

export async function listUploads(caseId?: string) {
  const uploads = readJson<UploadRecord[]>(uploadsFile, []);
  return caseId ? uploads.filter((item) => item.caseId === caseId) : uploads;
}

export function getUploadDirectory() {
  return path.isAbsolute(env.uploadDir) ? env.uploadDir : path.join(appRoot, env.uploadDir);
}
