import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { sampleCases, sampleOffers, documentLibrary, type BankOffer, type CaseRecord, type CaseStage } from '@/data/domain';
import { env, hasAirtableConfig } from '@/lib/env';
import {
  createAirtableActivityLog,
  createAirtableAiReviewStub,
  createAirtableBankRun,
  createAirtableCase,
  createAirtableCaseDocument,
  getAirtableCaseByCaseId,
  listAirtableBankRuns,
  listAirtableCases,
  updateAirtableCase,
  updateAirtableCaseStage,
  updateAirtablePortalStatus,
} from '@/lib/airtable';
import { postJson, triggerN8n } from '@/lib/n8n';
import type { CaseUpdateInput, CreateBankOfferInput, CreateCaseInput, PortalInvite, UploadRecord } from '@/lib/types';

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
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
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

function getStageSummary(stage: CaseStage) {
  switch (stage) {
    case 'intake-submitted':
    case 'approved':
    case 'portal-activated':
    case 'documents-in-progress':
    case 'secretary-review':
      return { phase: 'intake-complete', note: 'Intake and document collection are being reviewed.' };
    case 'waiting-appraiser':
    case 'appraisal-received':
      return { phase: 'appraisal-property-docs', note: 'Property and appraisal work is in progress.' };
    case 'ready-for-bank':
    case 'bank-negotiation':
    case 'recommendation-prepared':
    case 'completed':
      return { phase: 'advisor-bank-offers', note: 'Advisor and bank-offer work is underway.' };
    default:
      return { phase: 'intake-complete', note: 'The case has been opened and is waiting for the next action.' };
  }
}

async function triggerOfficeAlert(kind: string, payload: Record<string, unknown>) {
  if (env.officeAlertWebhookUrl) {
    return postJson(env.officeAlertWebhookUrl, { kind, ...payload });
  }

  if (env.n8nWebhookBaseUrl) {
    return triggerN8n(`keypoint/${kind}`, payload);
  }

  return { ok: false, error: 'No office alert path configured' } as const;
}

async function triggerAdvisorReady(caseRecord: CaseRecord) {
  if (caseRecord.stage !== 'ready-for-bank') return { ok: true, skipped: true } as const;
  return triggerOfficeAlert('advisor-ready', {
    caseId: caseRecord.id,
    assignedTo: caseRecord.assignedTo,
    stage: caseRecord.stage,
    nextAction: caseRecord.nextAction,
  });
}

function buildAnonymizedReviewPayload(caseRecord: CaseRecord, offers: BankOffer[]) {
  return {
    caseId: caseRecord.id,
    phase: getStageSummary(caseRecord.stage).phase,
    stage: caseRecord.stage,
    caseType: caseRecord.caseType,
    borrowerProfiles: caseRecord.borrowerProfiles,
    missingItems: caseRecord.missingItems,
    assignedTo: caseRecord.assignedTo,
    bankTargets: caseRecord.bankTargets,
    nextAction: caseRecord.nextAction,
    offerCount: offers.length,
    offers: offers.map((offer) => ({
      bank: offer.bank,
      status: offer.status,
      firstPayment: offer.firstPayment || '',
      maxPayment: offer.maxPayment || '',
      totalRepayment: offer.totalRepayment || '',
      expiresAt: offer.expiresAt || '',
    })),
    generatedAt: new Date().toISOString(),
  };
}

async function triggerStageReview(caseRecord: CaseRecord) {
  const offers = await listBankOffers(caseRecord.id);
  const payload = buildAnonymizedReviewPayload(caseRecord, offers);
  const payloadRef = `stage-review:${caseRecord.id}:${Date.now()}`;

  if (hasAirtableConfig()) {
    await createAirtableAiReviewStub(caseRecord.id, caseRecord.stage, payloadRef);
  }

  if (env.aiReviewWebhookUrl) {
    return postJson(env.aiReviewWebhookUrl, payload);
  }

  if (env.n8nWebhookBaseUrl) {
    return triggerN8n('keypoint/stage-review', payload);
  }

  return { ok: false, error: 'No AI review hook configured' } as const;
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
  await triggerOfficeAlert('secretary-alert', {
    caseId: created.data.id,
    leadName: created.data.leadName,
    stage: created.data.stage,
    assignedTo: created.data.assignedTo,
  });
  return created;
}

export async function updateCase(caseId: string, input: CaseUpdateInput) {
  if (!hasAirtableConfig()) {
    return { ok: false, error: 'Airtable must be configured to update case data' } as const;
  }

  const updated = await updateAirtableCase(caseId, input);
  if (!updated.ok || !updated.data) return updated;

  const activityParts = [
    input.stage ? `stage ${input.stage}` : '',
    typeof input.assignedTo === 'string' ? `owner ${input.assignedTo}` : '',
    typeof input.portalStatus === 'string' ? `portal ${input.portalStatus}` : '',
    typeof input.nextAction === 'string' ? 'next action updated' : '',
    typeof input.missingItemsCount === 'number' ? `missing items ${input.missingItemsCount}` : '',
  ].filter(Boolean);

  if (activityParts.length) {
    await createAirtableActivityLog(caseId, 'case-updated', `Updated ${activityParts.join(', ')}`);
  }

  if (input.notesAppend?.trim()) {
    await createAirtableActivityLog(caseId, 'case-note-added', input.notesAppend.trim());
  }

  if (input.stage) {
    await triggerStageReview(updated.data);
    await triggerAdvisorReady(updated.data);
  }

  return updated;
}

export async function setCaseStage(caseId: string, stage: CaseStage) {
  return updateCase(caseId, { stage });
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
    await createAirtableActivityLog(caseId, 'portal-invite-generated', 'Client progress link generated');
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

export async function listBankOffers(caseId: string): Promise<BankOffer[]> {
  if (hasAirtableConfig()) {
    const result = await listAirtableBankRuns(caseId);
    if (result.ok && result.data) return result.data;
  }

  return sampleOffers;
}

export async function createBankOffer(input: CreateBankOfferInput) {
  if (!hasAirtableConfig()) {
    return { ok: false, error: 'Airtable must be configured to save bank offers' } as const;
  }

  const created = await createAirtableBankRun(input);
  if (!created.ok) return created;

  await createAirtableActivityLog(input.caseId, 'bank-offer-added', `Added ${input.bank} offer (${input.status})`);

  const caseRecord = await getCase(input.caseId);
  if (caseRecord) {
    await triggerStageReview(caseRecord);
  }

  return { ok: true, data: input } as const;
}

export function getStagePresentation(stage: CaseStage) {
  return getStageSummary(stage);
}

export function getUploadDirectory() {
  return path.isAbsolute(env.uploadDir) ? env.uploadDir : path.join(appRoot, env.uploadDir);
}
