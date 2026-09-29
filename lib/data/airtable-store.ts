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

  seedCaseDocuments: async (caseId, codes) => {
    const result = await seedAirtableCaseDocuments(caseId, codes);
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
