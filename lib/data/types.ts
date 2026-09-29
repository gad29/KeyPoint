import type { BankOffer, CaseRecord, CaseStage } from '@/data/domain';
import type { DataBackend } from '@/lib/env';
import type { ActionResult, CaseUpdateInput, CreateBankOfferInput, CreateCaseInput, UploadRecord } from '@/lib/types';

export interface CaseDocumentRecord {
  recordId: string;
  caseId: string;
  documentCode: string;
  status: string;
  uploadedFileUrl?: string;
  reviewNotes?: string;
  approvedAt?: string;
}

export interface CaseContactInput {
  fullName: string;
  idNumber?: string;
  preferredLanguage?: string;
  phone?: string;
  email?: string;
  role?: 'primary' | 'secondary' | 'contact';
}

export interface StaffUserRow {
  recordId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  active: boolean;
  role: string;
}

export type StaffSummaryRow = Omit<StaffUserRow, 'passwordHash'>;

export interface FinanceTransactionRow {
  id: string;
  type: 'income' | 'expense' | 'unknown';
  amount: number;
  category: string;
  description: string;
  caseId: string;
  dateMs: number;
}

export interface CreateFinanceTransactionInput {
  date: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  caseId?: string;
}

export interface BillingEventInput {
  kind: string;
  targetEmail?: string;
  caseId?: string;
  amount?: number;
  notes?: string;
  triggeredByEmail?: string;
}

export interface CaseLookupResult {
  caseId: string;
  leadName: string;
  stage: CaseStage;
}

/**
 * The single contract every storage backend implements. `caseId` is always the
 * public case number (e.g. CASE-1001), never a backend-internal id.
 */
export interface DataStore {
  kind: DataBackend;

  listCases(): Promise<ActionResult<CaseRecord[]>>;
  getCase(caseId: string): Promise<ActionResult<CaseRecord>>;
  createCase(input: CreateCaseInput & { answers?: unknown }): Promise<ActionResult<CaseRecord>>;
  updateCase(caseId: string, input: CaseUpdateInput): Promise<ActionResult<CaseRecord>>;
  addCaseContact(caseId: string, contact: CaseContactInput): Promise<ActionResult<{ id: string }>>;
  findCaseByContactIdNumber(idNumber: string): Promise<ActionResult<CaseLookupResult | null>>;

  logActivity(caseId: string, eventType: string, summary: string, actor?: string): Promise<ActionResult<{ id: string }>>;

  seedCaseDocuments(caseId: string, documentCodes: string[]): Promise<ActionResult<string[]>>;
  createCaseDocument(caseId: string, documentCode: string, fileUrl: string, status?: string): Promise<ActionResult<{ id: string }>>;
  listCaseDocuments(caseId: string): Promise<ActionResult<CaseDocumentRecord[]>>;
  updateCaseDocumentStatus(caseId: string, documentCode: string, status: string, reviewNote?: string): Promise<ActionResult<CaseDocumentRecord>>;

  recordUpload(record: UploadRecord): Promise<ActionResult<{ id: string }>>;
  listUploads(caseId?: string): Promise<UploadRecord[]>;

  listBankOffers(caseId: string): Promise<ActionResult<BankOffer[]>>;
  createBankOffer(input: CreateBankOfferInput): Promise<ActionResult<{ id: string }>>;
  createAiReviewStub(caseId: string, triggeredBy: string, payloadRef: string): Promise<ActionResult<{ id: string }>>;

  findStaffByEmail(email: string): Promise<ActionResult<StaffUserRow>>;
  createStaff(input: { email: string; passwordHash: string; fullName?: string; role?: string }): Promise<ActionResult<{ id: string }>>;
  updateStaffPasswordHash(recordId: string, passwordHash: string): Promise<ActionResult<{ id: string }>>;
  listStaff(): Promise<ActionResult<StaffSummaryRow[]>>;

  listRecentFinanceTransactions(): Promise<ActionResult<FinanceTransactionRow[]>>;
  createFinanceTransaction(input: CreateFinanceTransactionInput): Promise<ActionResult<{ id: string }>>;
  logBillingEvent(input: BillingEventInput): Promise<ActionResult<{ id: string }>>;
}
