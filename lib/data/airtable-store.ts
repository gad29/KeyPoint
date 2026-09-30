import {
  createAirtableActivityLog,
  createAirtableAiReviewStub,
  createAirtableBankRun,
  createAirtableCase,
  createAirtableCaseContact,
  createAirtableCaseDocument,
  findCaseByApplicantIdNumber,
  getAirtableCaseByCaseId,
  listAirtableBankRuns,
  listAirtableCaseDocuments,
  listAirtableCases,
  seedAirtableCaseDocuments,
  updateAirtableCase,
  updateAirtableCaseDocumentStatus,
} from '@/lib/airtable';
import { createStaffInAirtable, findStaffByEmail, listStaffUsers, updateStaffPasswordHash } from '@/lib/airtable-staff';
import { createAirtableFinanceTransaction, listRecentFinanceTransactions, logBillingEventToAirtable } from '@/lib/airtable-finance';
import { appendUploadToFile, readUploadsFromFile } from '@/lib/data/json-file';
import type { DataStore } from '@/lib/data/types';
import type { ActionResult } from '@/lib/types';

const needsDatabase = { ok: false as const, error: 'Saving templates and branding needs the Postgres backend (DATABASE_URL).' };

function withId(result: { ok: boolean; data?: unknown; error?: string }): ActionResult<{ id: string }> {
  if (!result.ok) return { ok: false, error: result.error || 'Airtable request failed' };
  const id = (result.data as { id?: string } | undefined)?.id;
  return { ok: true, data: { id: id || '' } };
}

/** Airtable as system of record. Kept as a fully supported backend for existing tenants. */
export const airtableStore: DataStore = {
  kind: 'airtable',

  listCases: listAirtableCases,
  getCase: getAirtableCaseByCaseId,
  createCase: (input) => createAirtableCase(input),
  updateCase: updateAirtableCase,
  addCaseContact: async (caseId, contact) => withId(await createAirtableCaseContact(caseId, contact)),
  findCaseByContactIdNumber: findCaseByApplicantIdNumber,

  logActivity: async (caseId, eventType, summary, actor) => withId(await createAirtableActivityLog(caseId, eventType, summary, actor)),

  seedCaseDocuments: async (caseId, documents) => {
    const result = await seedAirtableCaseDocuments(caseId, documents);
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
  },
  createCaseDocument: async (caseId, code, fileUrl, status) => withId(await createAirtableCaseDocument(caseId, code, fileUrl, status)),
  listCaseDocuments: listAirtableCaseDocuments,
  updateCaseDocumentStatus: updateAirtableCaseDocumentStatus,

  recordUpload: async (record) => {
    appendUploadToFile(record);
    return { ok: true, data: { id: record.id } };
  },
  listUploads: async (caseId) => readUploadsFromFile(caseId),
  getUpload: async (uploadId) => readUploadsFromFile().find((u) => u.id === uploadId),

  listTemplates: async () => ({ ok: true, data: [] }),
  getTemplate: async () => ({ ok: true, data: null }),
  saveTemplate: async () => needsDatabase,
  deleteTemplate: async () => needsDatabase,

  // Airtable has no signatures table: keep a durable audit line in the case notes and activity log.
  saveContractSignature: async (caseId, signature) => {
    const line = `Contract signed: "${signature.contractTitle}" by ${signature.signerName} at ${new Date().toISOString()} (sha256 ${signature.contentHash}, ip ${signature.ip || '-'})`;
    const updated = await updateAirtableCase(caseId, { notesAppend: line });
    if (!updated.ok) return { ok: false, error: updated.error || 'Failed to record signature' };
    await createAirtableActivityLog(caseId, 'contract-signed', line, signature.signerName);
    return { ok: true, data: { id: signature.contentHash } };
  },
  listContractSignatures: async () => ({ ok: true, data: [] }),

  getBranding: async () => ({ ok: true, data: {} }),
  saveBranding: async () => needsDatabase,

  listBankOffers: listAirtableBankRuns,
  createBankOffer: async (input) => withId(await createAirtableBankRun(input)),
  createAiReviewStub: async (caseId, triggeredBy, payloadRef) => withId(await createAirtableAiReviewStub(caseId, triggeredBy, payloadRef)),

  findStaffByEmail,
  createStaff: createStaffInAirtable,
  updateStaffPasswordHash,
  listStaff: listStaffUsers,

  listRecentFinanceTransactions,
  createFinanceTransaction: createAirtableFinanceTransaction,
  logBillingEvent: logBillingEventToAirtable,
};
