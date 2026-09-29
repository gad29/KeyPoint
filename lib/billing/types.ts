import type { InvoiceRecord, InvoiceLineItem, ChaseRun } from '@/data/domain';
import type { ActionResult } from '@/lib/types';

export type BillingAdapterId = 'stripe' | 'icount' | 'green-invoice' | 'quickbooks' | 'xero' | 'internal';

export interface CreateInvoiceInput {
  caseId: string;
  clientName: string;
  clientEmail?: string;
  currency: string;
  lineItems: InvoiceLineItem[];
  dueAt?: string;
  vatRate?: number;
  notes?: string;
}

/**
 * Common surface every payment/accounting adapter must implement. Adapters that
 * do not support an operation should return { ok: false, error: 'unsupported' }.
 */
export interface BillingAdapter {
  id: BillingAdapterId;
  isConfigured(): boolean;
  createInvoice(input: CreateInvoiceInput): Promise<ActionResult<InvoiceRecord>>;
  getInvoice(externalId: string): Promise<ActionResult<InvoiceRecord>>;
  listOverdue(): Promise<ActionResult<InvoiceRecord[]>>;
  markPaidExternally?(externalId: string): Promise<ActionResult<InvoiceRecord>>;
}

export interface ChaseSendInput {
  invoiceId: string;
  stepIndex: number;
}

export interface ChaseAdapter {
  sendChase(input: ChaseSendInput): Promise<ActionResult<ChaseRun>>;
}
