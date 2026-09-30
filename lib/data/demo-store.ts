import crypto from 'node:crypto';
import path from 'node:path';
import { sampleCases, sampleOffers, type BankOffer, type CaseRecord } from '@/data/domain';
import { appendUploadToFile, dataRoot, readJson, readUploadsFromFile, writeJson } from '@/lib/data/json-file';
import type { CaseContactInput, CaseDocumentRecord, DataStore } from '@/lib/data/types';
import type { AgencyBranding, ContractSignature, OnboardingTemplate } from '@/lib/onboarding/types';

type DemoDb = {
  caseSeq: number;
  cases: Array<CaseRecord & { notes?: string; answers?: unknown }>;
  contacts: Array<CaseContactInput & { id: string; caseId: string }>;
  documents: CaseDocumentRecord[];
  offers: Array<BankOffer & { caseId: string }>;
  templates?: OnboardingTemplate[];
  signatures?: ContractSignature[];
  branding?: Partial<AgencyBranding>;
};

const dbFile = path.join(dataRoot, 'demo-db.json');

function load(): DemoDb {
  return readJson<DemoDb>(dbFile, {
    caseSeq: 2000,
    cases: sampleCases.map((c) => ({ ...c })),
    contacts: [],
    documents: [],
    offers: sampleCases[0] ? sampleOffers.map((o) => ({ ...o, caseId: sampleCases[0].id })) : [],
  });
}

function mutate<T>(fn: (db: DemoDb) => T): T {
  const db = load();
  const result = fn(db);
  writeJson(dbFile, db);
  return result;
}

const unsupported = { ok: false as const, error: 'Not available in demo mode. Connect Postgres (DATABASE_URL) or Airtable.' };

/** Local JSON demo backend: lets the app run end-to-end with zero configuration. Not for production. */
export const demoStore: DataStore = {
  kind: 'demo',

  async listCases() {
    return { ok: true, data: load().cases };
  },

  async getCase(caseId) {
    const found = load().cases.find((c) => c.id === caseId);
    return found ? { ok: true, data: found } : { ok: false, error: 'Case not found' };
  },

  async createCase(input) {
    const record = mutate((db) => {
      db.caseSeq += 1;
      const created: DemoDb['cases'][number] = {
        id: `CASE-${db.caseSeq}`,
        leadName: input.leadName,
        spouseName: input.spouseName,
        phone: input.phone,
        email: input.email,
        stage: (input.stage || 'new-lead') as CaseRecord['stage'],
        caseType: input.caseType as CaseRecord['caseType'],
        borrowerProfiles: input.borrowerProfiles as CaseRecord['borrowerProfiles'],
        missingItems: input.missingItemsCount ?? 0,
        assignedTo: input.assignedTo || 'Unassigned',
        bankTargets: [],
        nextAction: input.nextAction || 'Review intake and move the case forward.',
        portalStatus: input.portalStatus || 'not-invited',
        notes: input.notes,
        answers: input.answers,
        templateSlug: input.templateSlug,
      };
      db.cases.push(created);
      return created;
    });
    return { ok: true, data: record };
  },

  async updateCase(caseId, input) {
    const updated = mutate((db) => {
      const target = db.cases.find((c) => c.id === caseId);
      if (!target) return undefined;
      if (input.stage) target.stage = input.stage;
      if (typeof input.assignedTo === 'string') target.assignedTo = input.assignedTo;
      if (typeof input.portalStatus === 'string') target.portalStatus = input.portalStatus;
      if (typeof input.nextAction === 'string') target.nextAction = input.nextAction;
      if (typeof input.missingItemsCount === 'number') target.missingItems = input.missingItemsCount;
      if (input.notesAppend?.trim()) target.notes = [target.notes, input.notesAppend.trim()].filter(Boolean).join('\n\n');
      return target;
    });
    return updated ? { ok: true, data: updated } : { ok: false, error: 'Case not found' };
  },

  async addCaseContact(caseId, contact) {
    const id = crypto.randomUUID();
    mutate((db) => db.contacts.push({ ...contact, id, caseId }));
    return { ok: true, data: { id } };
  },

  async findCaseByContactIdNumber(idNumber) {
    const db = load();
    const contact = db.contacts.find((c) => c.idNumber === idNumber);
    const found = contact && db.cases.find((c) => c.id === contact.caseId);
    return { ok: true, data: found ? { caseId: found.id, leadName: found.leadName, stage: found.stage } : null };
  },

  async logActivity() {
    return { ok: true, data: { id: crypto.randomUUID() } };
  },

  async seedCaseDocuments(caseId, documents) {
    mutate((db) => {
      for (const doc of documents) {
        db.documents.push({ recordId: crypto.randomUUID(), caseId, documentCode: doc.code, required: doc.required, status: 'not-uploaded' });
      }
    });
    return { ok: true, data: documents.map((d) => d.code) };
  },

  async createCaseDocument(caseId, documentCode, fileUrl, status = 'uploaded') {
    const id = mutate((db) => {
      const existing = db.documents.find((d) => d.caseId === caseId && d.documentCode === documentCode);
      if (existing) {
        existing.status = status;
        existing.uploadedFileUrl = fileUrl;
        return existing.recordId;
      }
      const recordId = crypto.randomUUID();
      db.documents.push({ recordId, caseId, documentCode, status, uploadedFileUrl: fileUrl });
      return recordId;
    });
    return { ok: true, data: { id } };
  },

  async listCaseDocuments(caseId) {
    return { ok: true, data: load().documents.filter((d) => d.caseId === caseId) };
  },

  async updateCaseDocumentStatus(caseId, documentCode, status, reviewNote) {
    const doc = mutate((db) => {
      const target = db.documents.find((d) => d.caseId === caseId && d.documentCode === documentCode);
      if (!target) return undefined;
      target.status = status;
      if (reviewNote) target.reviewNotes = reviewNote;
      if (status === 'approved') target.approvedAt = new Date().toISOString();
      return target;
    });
    return doc ? { ok: true, data: doc } : { ok: false, error: `Document ${documentCode} not found for case ${caseId}` };
  },

  async recordUpload(record) {
    appendUploadToFile(record);
    return { ok: true, data: { id: record.id } };
  },

  async listUploads(caseId) {
    return readUploadsFromFile(caseId);
  },

  async getUpload(uploadId) {
    return readUploadsFromFile().find((u) => u.id === uploadId);
  },

  async listTemplates() {
    return { ok: true, data: load().templates ?? [] };
  },

  async getTemplate(slug) {
    return { ok: true, data: (load().templates ?? []).find((t) => t.slug === slug) ?? null };
  },

  async saveTemplate(template) {
    mutate((db) => {
      const list = (db.templates ??= []);
      const index = list.findIndex((t) => t.slug === template.slug);
      if (index >= 0) list[index] = template;
      else list.push(template);
    });
    return { ok: true, data: template };
  },

  async deleteTemplate(slug) {
    mutate((db) => {
      db.templates = (db.templates ?? []).filter((t) => t.slug !== slug);
    });
    return { ok: true, data: { slug } };
  },

  async saveContractSignature(caseId, signature) {
    const id = crypto.randomUUID();
    mutate((db) => (db.signatures ??= []).push({ ...signature, id, caseId, signedAt: new Date().toISOString() }));
    return { ok: true, data: { id } };
  },

  async listContractSignatures(caseId) {
    return { ok: true, data: (load().signatures ?? []).filter((s) => s.caseId === caseId) };
  },

  async getBranding() {
    return { ok: true, data: load().branding ?? {} };
  },

  async saveBranding(branding) {
    mutate((db) => {
      db.branding = branding;
    });
    return { ok: true, data: branding };
  },

  async listBankOffers(caseId) {
    return { ok: true, data: load().offers.filter((o) => o.caseId === caseId) };
  },

  async createBankOffer(input) {
    mutate((db) => db.offers.push({ ...input }));
    return { ok: true, data: { id: crypto.randomUUID() } };
  },

  async createAiReviewStub() {
    return { ok: true, data: { id: crypto.randomUUID() } };
  },

  async findStaffByEmail() {
    return unsupported;
  },
  async createStaff() {
    return unsupported;
  },
  async updateStaffPasswordHash() {
    return unsupported;
  },
  async listStaff() {
    return { ok: true, data: [] };
  },

  async listRecentFinanceTransactions() {
    return { ok: true, data: [] };
  },
  async createFinanceTransaction() {
    return { ok: true, data: { id: 'local' } };
  },
  async logBillingEvent() {
    return { ok: true, data: { id: 'local' } };
  },
};
