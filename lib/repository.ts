import path from 'node:path';
import crypto from 'node:crypto';
import type { BankOffer, CaseRecord, CaseStage } from '@/data/domain';
import { env, hasLiveDataStore, hasN8nConfig } from '@/lib/env';
import { getStore, type CaseContactInput, type SeedDocument } from '@/lib/data';
import { getActivePreset } from '@/lib/presets';
import { getDocumentLabels, resolveTemplate } from '@/lib/onboarding';
import type { DocumentRequirement } from '@/data/domain';
import { postJson, triggerN8n } from '@/lib/n8n';
import type { CaseUpdateInput, CreateBankOfferInput, CreateCaseInput, PortalInvite, UploadRecord } from '@/lib/types';

const appRoot = process.cwd();

function logRepository(level: 'info' | 'warn' | 'error', message: string, details?: Record<string, unknown>) {
  const payload = details ? ` ${JSON.stringify(details)}` : '';
  const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  logger(`[AgencyOS Repository] ${message}${payload}`);
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

type InviteTokenPayload = { caseId: string; expiresAt: string };

/** The payload is readable (base64), so it carries no personal data: just the case and expiry, signed. */
function makeInviteToken(caseRecord: CaseRecord) {
  const payload: InviteTokenPayload = {
    caseId: caseRecord.id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  };

  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = signInvitePayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseInviteToken(token: string): InviteTokenPayload | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signInvitePayload(encodedPayload);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

  try {
    const payload = JSON.parse(decodeBase64url(encodedPayload)) as Partial<InviteTokenPayload>;
    if (!payload.caseId || !payload.expiresAt) return null;
    if (new Date(payload.expiresAt).getTime() < Date.now()) return null;
    return { caseId: payload.caseId, expiresAt: payload.expiresAt };
  } catch {
    return null;
  }
}

/** Personal client link (progress + uploads). Stateless and signed; valid for 30 days. */
export function issueClientLink(caseRecord: CaseRecord) {
  const token = makeInviteToken(caseRecord);
  return { token, url: `${env.keypointAppBaseUrl.replace(/\/$/, '')}/progress/${token}` };
}

export function caseIdFromClientToken(token: string): string | null {
  return parseInviteToken(token)?.caseId ?? null;
}

function getStageSummary(stage: CaseStage) {
  switch (stage) {
    case 'invited':
    case 'onboarding':
    case 'intake-submitted':
    case 'approved':
    case 'portal-activated':
    case 'documents-in-progress':
    case 'secretary-review':
      return { phase: 'intake-complete', note: 'Intake and document collection are being reviewed.' };
    case 'in-service':
      return { phase: 'in-service', note: 'The work is in progress.' };
    case 'waiting-appraiser':
    case 'appraisal-received':
      return { phase: 'appraisal-property-docs', note: 'Property and appraisal work is in progress.' };
    case 'ready-for-bank':
    case 'bank-negotiation':
    case 'recommendation-prepared':
      return { phase: 'advisor-bank-offers', note: 'Advisor and bank-offer work is underway.' };
    case 'invoice-sent':
    case 'overdue':
      return { phase: 'billing', note: 'The invoice has been issued and payment is pending.' };
    case 'paid':
    case 'completed':
    case 'archived':
      return { phase: 'completed', note: 'The engagement is complete.' };
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

async function triggerOfferComparison(caseId: string) {
  if (!hasN8nConfig()) return { ok: false, error: 'skip' } as const;
  const offers = await listBankOffers(caseId);
  return triggerN8n('keypoint/offer-comparison', {
    caseId,
    offerCount: offers.length,
    offers: offers.map((o) => ({
      bank: o.bank,
      status: o.status,
      firstPayment: o.firstPayment || '',
      maxPayment: o.maxPayment || '',
      totalRepayment: o.totalRepayment || '',
      expiresAt: o.expiresAt || '',
    })),
  });
}

async function triggerStageReview(caseRecord: CaseRecord) {
  const offers = getActivePreset().features.bankOffers ? await listBankOffers(caseRecord.id) : [];
  const payload = buildAnonymizedReviewPayload(caseRecord, offers);
  const payloadRef = `stage-review:${caseRecord.id}:${Date.now()}`;

  if (hasLiveDataStore()) {
    const stub = await getStore().createAiReviewStub(caseRecord.id, caseRecord.stage, payloadRef);
    if (!stub.ok) {
      logRepository('warn', 'AI review stub could not be created', { caseId: caseRecord.id, error: stub.error });
    }
  }

  if (env.aiReviewWebhookUrl) {
    return postJson(env.aiReviewWebhookUrl, payload);
  }

  if (env.n8nWebhookBaseUrl) {
    return triggerN8n('keypoint/stage-review', payload);
  }

  return { ok: false, error: 'No AI review hook configured' } as const;
}

async function safeActivityLog(caseId: string, eventType: string, summary: string, actor?: string) {
  const result = await getStore().logActivity(caseId, eventType, summary, actor);
  if (!result.ok) {
    logRepository('warn', 'Activity log write failed', { caseId, eventType, error: result.error });
  }
  return result;
}

export async function listCases(): Promise<CaseRecord[]> {
  const result = await getStore().listCases();
  if (result.ok && result.data) return result.data;
  logRepository('warn', 'Falling back to empty case list because listing failed', { error: result.error });
  return [];
}

export async function getCase(caseId: string): Promise<CaseRecord | undefined> {
  const result = await getStore().getCase(caseId);
  return result.ok ? result.data : undefined;
}

export async function createCase(input: CreateCaseInput) {
  const created = await getStore().createCase(input);
  if (!created.ok || !created.data) return created;

  await safeActivityLog(created.data.id, 'case-created', 'Case created from Agency OS app');
  const alertResult = await triggerOfficeAlert('secretary-alert', {
    caseId: created.data.id,
    leadName: created.data.leadName,
    stage: created.data.stage,
    assignedTo: created.data.assignedTo,
  });

  if (!alertResult.ok) {
    logRepository('warn', 'Secretary alert trigger failed after case creation', {
      caseId: created.data.id,
      error: alertResult.error,
    });
  }

  return created;
}

export interface CreateIntakeCaseInput extends CreateCaseInput {
  answers?: unknown;
  contacts: CaseContactInput[];
  documents: SeedDocument[];
}

/**
 * Public intake flow shared by every preset: create the case, attach the people,
 * seed the required-document checklist, and log it. Secondary writes are
 * best-effort; their failures come back as warnings instead of failing the intake.
 */
export async function createIntakeCase(input: CreateIntakeCaseInput) {
  const store = getStore();
  const { contacts, documents, ...caseInput } = input;
  const requiredDocumentCodes = documents.filter((d) => d.required).map((d) => d.code);
  const created = await store.createCase({
    ...caseInput,
    missingItemsCount: requiredDocumentCodes.length,
    portalStatus: 'pending-office-approval',
    nextAction: 'Review intake, approve the case, and send the client progress link.',
  });

  if (!created.ok || !created.data) {
    return { ok: false as const, error: created.error || 'Failed to create case' };
  }

  const caseId = created.data.id;
  const warnings: string[] = [];
  let contactsCreated = 0;

  for (const contact of contacts) {
    const result = await store.addCaseContact(caseId, contact);
    if (result.ok) contactsCreated += 1;
    else warnings.push(result.error || 'Contact creation failed');
  }

  const seeded = await store.seedCaseDocuments(caseId, documents);
  if (!seeded.ok) warnings.push(seeded.error || 'Document checklist seeding failed');

  const activity = await store.logActivity(caseId, 'intake_received', 'Intake captured and case seeded', 'system');
  if (!activity.ok) warnings.push(activity.error || 'Activity log creation failed');

  if (warnings.length) logRepository('warn', 'Intake created with warnings', { caseId, warnings });

  return {
    ok: true as const,
    data: created.data,
    meta: { requiredDocumentCodes, clientsCreated: contactsCreated, warnings },
  };
}

export async function findCaseByApplicantIdNumber(idNumber: string) {
  return getStore().findCaseByContactIdNumber(idNumber);
}

export async function updateCase(caseId: string, input: CaseUpdateInput) {
  const updated = await getStore().updateCase(caseId, input);
  if (!updated.ok || !updated.data) return updated;

  const activityParts = [
    input.stage ? `stage ${input.stage}` : '',
    typeof input.assignedTo === 'string' ? `owner ${input.assignedTo}` : '',
    typeof input.portalStatus === 'string' ? `portal ${input.portalStatus}` : '',
    typeof input.nextAction === 'string' ? 'next action updated' : '',
    typeof input.missingItemsCount === 'number' ? `missing items ${input.missingItemsCount}` : '',
  ].filter(Boolean);

  if (activityParts.length) {
    await safeActivityLog(caseId, 'case-updated', `Updated ${activityParts.join(', ')}`);
  }

  if (input.notesAppend?.trim()) {
    await safeActivityLog(caseId, 'case-note-added', input.notesAppend.trim());
  }

  if (input.stage) {
    const reviewResult = await triggerStageReview(updated.data);
    if (!reviewResult.ok) {
      logRepository('warn', 'Stage review trigger failed', { caseId, stage: input.stage, error: reviewResult.error });
    }

    const advisorResult = await triggerAdvisorReady(updated.data);
    if (!advisorResult.ok) {
      logRepository('warn', 'Advisor-ready trigger failed', { caseId, stage: input.stage, error: advisorResult.error });
    }
  }

  return updated;
}

export async function setCaseStage(caseId: string, stage: CaseStage) {
  return updateCase(caseId, { stage });
}

export type ChecklistItem = DocumentRequirement & { required: boolean };

/**
 * Document checklist for a case. Mortgage preset: its rule-based library. Other presets: the
 * documents seeded at intake (source of truth), falling back to the case's template.
 */
export async function getCaseChecklist(caseId: string): Promise<ChecklistItem[]> {
  const caseRecord = await getCase(caseId);
  if (!caseRecord) return [];

  const library = getActivePreset().documentLibrary;
  if (library?.length) {
    return library.map((doc) => ({
      ...doc,
      required:
        (!doc.caseTypes || doc.caseTypes.includes(caseRecord.caseType)) &&
        (!doc.borrowerProfiles || doc.borrowerProfiles.some((profile) => caseRecord.borrowerProfiles.includes(profile))),
    }));
  }

  const [rows, template, labels] = await Promise.all([
    listCaseDocuments(caseId),
    resolveTemplate(caseRecord.templateSlug),
    getDocumentLabels(),
  ]);
  const templateDocs = template?.documents ?? [];
  const source = rows.length
    ? rows.map((row) => ({
        code: row.documentCode,
        required: row.required ?? templateDocs.find((d) => d.code === row.documentCode)?.required ?? true,
      }))
    : templateDocs.map((d) => ({ code: d.code, required: d.required }));

  return source.map(({ code, required }) => ({
    code,
    group: 'Documents',
    labelEn: labels[code]?.en ?? (code === 'other' ? 'Other file' : code),
    labelHe: labels[code]?.he ?? (code === 'other' ? 'קובץ נוסף' : code),
    description: '',
    required,
  }));
}

export async function createInvite(caseId: string): Promise<PortalInvite> {
  const caseRecord = await getCase(caseId);
  if (!caseRecord) throw new Error('Case not found');

  const token = makeInviteToken(caseRecord);
  const parsed = parseInviteToken(token);
  if (!parsed) throw new Error('Failed to create invite token');

  const portalStatusResult = await getStore().updateCase(caseId, { portalStatus: 'invited' });
  if (!portalStatusResult.ok) {
    logRepository('warn', 'Portal status update failed after invite generation', { caseId, error: portalStatusResult.error });
  }
  await safeActivityLog(caseId, 'portal-invite-generated', 'Client progress link generated');

  return { token, ...parsed, leadName: caseRecord.leadName, phone: caseRecord.phone };
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
  const store = getStore();
  const record: UploadRecord = {
    id: crypto.randomUUID(),
    uploadedAt: new Date().toISOString(),
    ...input,
  };

  const recorded = await store.recordUpload(record);
  if (recorded.ok && recorded.data?.id) {
    // Postgres assigns its own id; use it so download links resolve.
    record.id = recorded.data.id;
  } else if (!recorded.ok) {
    logRepository('warn', 'Upload file saved but upload record failed', { caseId: record.caseId, error: recorded.error });
  }

  let caseDocumentRecordId = '';
  const createdDocument = await store.createCaseDocument(record.caseId, record.documentCode, record.path);
  if (createdDocument.ok && createdDocument.data?.id) {
    caseDocumentRecordId = createdDocument.data.id;
  } else {
    logRepository('warn', 'Upload saved but case-document row failed', {
      caseId: record.caseId,
      documentCode: record.documentCode,
      error: createdDocument.error,
    });
  }
  await safeActivityLog(record.caseId, 'document-uploaded', `${record.fileName} uploaded for ${record.documentCode}`);

  if (env.n8nWebhookBaseUrl) {
    const caseRecord = await getCase(record.caseId);
    const automationResult = await triggerN8n('keypoint/document-upload', {
      caseDocumentRecordId,
      caseId: record.caseId,
      documentCode: record.documentCode,
      fileName: record.fileName,
      fileUrl: record.path,
      uploadedAt: record.uploadedAt,
      path: record.path,
      phone: caseRecord?.phone || '',
    });

    if (!automationResult.ok) {
      logRepository('warn', 'Document upload automation trigger failed', {
        caseId: record.caseId,
        documentCode: record.documentCode,
        error: automationResult.error,
      });
    }
  }

  return record;
}

export async function listUploads(caseId?: string) {
  return getStore().listUploads(caseId);
}

export async function listBankOffers(caseId: string): Promise<BankOffer[]> {
  const result = await getStore().listBankOffers(caseId);
  if (result.ok && result.data) return result.data;
  logRepository('warn', 'Bank-offer lookup failed; returning empty list', { caseId, error: result.error });
  return [];
}

export async function createBankOffer(input: CreateBankOfferInput) {
  const created = await getStore().createBankOffer(input);
  if (!created.ok) return created;

  await safeActivityLog(input.caseId, 'bank-offer-added', `Added ${input.bank} offer (${input.status})`);

  const caseRecord = await getCase(input.caseId);
  if (caseRecord) {
    const reviewResult = await triggerStageReview(caseRecord);
    if (!reviewResult.ok) {
      logRepository('warn', 'Stage review trigger failed after bank offer creation', {
        caseId: input.caseId,
        bank: input.bank,
        error: reviewResult.error,
      });
    }
  }

  const compareResult = await triggerOfferComparison(input.caseId);
  if (!compareResult.ok && compareResult.error !== 'skip') {
    logRepository('warn', 'Offer comparison webhook failed', { caseId: input.caseId, error: compareResult.error });
  }

  return { ok: true, data: input } as const;
}

export function getStagePresentation(stage: CaseStage) {
  return getStageSummary(stage);
}

export function getUploadDirectory() {
  return path.isAbsolute(env.uploadDir) ? env.uploadDir : path.join(appRoot, env.uploadDir);
}

export async function listCaseDocuments(caseId: string) {
  const result = await getStore().listCaseDocuments(caseId);
  if (result.ok && result.data) return result.data;
  logRepository('warn', 'Case document listing failed', { caseId, error: result.error });
  return [];
}

export async function updateCaseDocumentStatus(caseId: string, documentCode: string, status: string, reviewNote?: string) {
  const result = await getStore().updateCaseDocumentStatus(caseId, documentCode, status, reviewNote);
  if (result.ok) {
    await safeActivityLog(caseId, 'document-status-updated', `Document ${documentCode} → ${status}`);
  }
  return result;
}
