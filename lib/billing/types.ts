import type { ChaseRun, ChaseRunStatus, ChaseStep, InvoicePayment, InvoiceRecord, InvoiceStatus } from '@/data/domain';
import type { ActionResult } from '@/lib/types';

export interface BillingSettings {
  /** Percent, e.g. 18 for Israeli VAT. */
  defaultVatRate: number;
  defaultDueDays: number;
  /** Optional external payment link (Bit, PayBox, PayPal.me, bank portal…). */
  paymentLinkUrl: string;
  /** Free text shown on the payment page, e.g. bank transfer details. */
  paymentInstructions: string;
  cadence: ChaseStep[];
  /** When false (default) every reminder waits in the approval queue. */
  autoSend: boolean;
  /** Use Claude to draft reminders when ANTHROPIC_API_KEY is set; otherwise built-in templates. */
  aiDrafts: boolean;
}

export type NewInvoice = Omit<InvoiceRecord, 'id' | 'number' | 'createdAt' | 'amountPaid'>;

export type InvoicePatch = Partial<
  Pick<
    InvoiceRecord,
    | 'status'
    | 'issuedAt'
    | 'dueAt'
    | 'paidAt'
    | 'viewedAt'
    | 'chasePaused'
    | 'sourceAdapter'
    | 'externalId'
    | 'externalDocUrl'
    | 'clientEmail'
    | 'clientPhone'
    | 'summary'
    | 'notes'
  >
>;

export interface PaymentInput {
  amount: number;
  method: string;
  externalRef?: string;
}

export interface RecordPaymentResult {
  invoice: InvoiceRecord;
  /** True when a payment with the same externalRef was already recorded (webhook retry, race). */
  duplicate: boolean;
}

export type NewChaseRun = Omit<ChaseRun, 'id' | 'createdAt'>;

export interface InvoiceFilter {
  caseId?: string;
  statuses?: InvoiceStatus[];
}

export interface ChaseRunFilter {
  invoiceId?: string;
  status?: ChaseRunStatus;
}

/** Storage operations for billing; implemented by the Postgres and demo stores. */
export interface BillingStore {
  listInvoices(filter?: InvoiceFilter): Promise<ActionResult<InvoiceRecord[]>>;
  getInvoice(id: string): Promise<ActionResult<InvoiceRecord | null>>;
  getInvoiceByToken(token: string): Promise<ActionResult<InvoiceRecord | null>>;
  createInvoice(input: NewInvoice): Promise<ActionResult<InvoiceRecord>>;
  updateInvoice(id: string, patch: InvoicePatch): Promise<ActionResult<InvoiceRecord>>;
  recordPayment(invoiceId: string, payment: PaymentInput): Promise<ActionResult<RecordPaymentResult>>;
  listPayments(invoiceId: string): Promise<ActionResult<InvoicePayment[]>>;
  listChaseRuns(filter?: ChaseRunFilter): Promise<ActionResult<ChaseRun[]>>;
  createChaseRun(run: NewChaseRun): Promise<ActionResult<ChaseRun>>;
  updateChaseRun(id: string, patch: Partial<Pick<ChaseRun, 'status' | 'channel' | 'sentAt' | 'error' | 'subject' | 'body'>>): Promise<ActionResult<ChaseRun>>;
  getBillingSettings(): Promise<ActionResult<Partial<BillingSettings>>>;
  saveBillingSettings(settings: BillingSettings): Promise<ActionResult<BillingSettings>>;
}

export type AccountingProviderId = 'green-invoice' | 'icount' | 'quickbooks' | 'xero';

export interface TaxDocumentResult {
  externalId: string;
  docNumber?: string;
  docUrl?: string;
}

/**
 * Accounting systems that issue legally valid tax documents. `verified` is false until the
 * adapter has been exercised against a live account.
 */
export interface AccountingAdapter {
  id: AccountingProviderId;
  label: string;
  verified: boolean;
  isConfigured(): boolean;
  issueTaxDocument(invoice: InvoiceRecord, language: 'he' | 'en'): Promise<ActionResult<TaxDocumentResult>>;
}
