import crypto from 'node:crypto';
import { defaultChaseCadence, type ChaseRun, type ChaseStep, type InvoiceLineItem, type InvoiceRecord } from '@/data/domain';
import { env } from '@/lib/env';
import { getStore } from '@/lib/data';
import { getCase, updateCase } from '@/lib/repository';
import { getBranding } from '@/lib/onboarding';
import { balanceDue, computeTotals, daysBetween, defaultVatRateFor, round2 } from '@/lib/billing/money';
import { invoiceMessage, whatsappLink, type Lang } from '@/lib/billing/messages';
import { draftReminder } from '@/lib/billing/ai';
import { canSendEmail, sendEmail } from '@/lib/messaging/email';
import type { BillingSettings } from '@/lib/billing/types';
import type { ActionResult } from '@/lib/types';

const OPEN_STATUSES = ['sent', 'partial', 'overdue'] as const;
const CHASE_TONES = ['friendly', 'reminder', 'firm', 'final'] as const;

export async function getBillingSettings(): Promise<BillingSettings> {
  const stored = await getStore().getBillingSettings();
  const s = stored.ok && stored.data ? stored.data : {};
  const cadence = Array.isArray(s.cadence) && s.cadence.length ? s.cadence : defaultChaseCadence;
  return {
    defaultVatRate: typeof s.defaultVatRate === 'number' ? s.defaultVatRate : defaultVatRateFor(env.currency),
    defaultDueDays: typeof s.defaultDueDays === 'number' ? s.defaultDueDays : 14,
    paymentLinkUrl: s.paymentLinkUrl || '',
    paymentInstructions: s.paymentInstructions || '',
    cadence,
    autoSend: s.autoSend === true,
    aiDrafts: s.aiDrafts !== false,
  };
}

/** Validates settings coming from the admin form. */
export function sanitizeBillingSettings(raw: Record<string, unknown>): ActionResult<BillingSettings> {
  const vat = Number(raw.defaultVatRate);
  const dueDays = Number(raw.defaultDueDays);
  if (!Number.isFinite(vat) || vat < 0 || vat > 50) return { ok: false, error: 'שיעור מע״מ לא תקין' };
  if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 365) return { ok: false, error: 'מספר ימים לתשלום לא תקין' };
  const link = typeof raw.paymentLinkUrl === 'string' ? raw.paymentLinkUrl.trim() : '';
  if (link && !/^https:\/\/\S+$/.test(link)) return { ok: false, error: 'קישור התשלום חייב להתחיל ב-https://' };

  const rawCadence = Array.isArray(raw.cadence) ? raw.cadence.slice(0, 4) : [];
  const cadence: ChaseStep[] = rawCadence
    .map((step, index) => ({ dayOffset: Number((step as { dayOffset?: unknown }).dayOffset), tone: CHASE_TONES[Math.min(index, 3)] }))
    .filter((step) => Number.isInteger(step.dayOffset) && step.dayOffset >= 0 && step.dayOffset <= 365);
  for (let i = 1; i < cadence.length; i += 1) {
    if (cadence[i].dayOffset <= cadence[i - 1].dayOffset) return { ok: false, error: 'ימי התזכורות חייבים לעלות מתזכורת לתזכורת' };
  }

  return {
    ok: true,
    data: {
      defaultVatRate: round2(vat),
      defaultDueDays: dueDays,
      paymentLinkUrl: link,
      paymentInstructions: typeof raw.paymentInstructions === 'string' ? raw.paymentInstructions.trim().slice(0, 1000) : '',
      cadence: cadence.length ? cadence : defaultChaseCadence,
      autoSend: raw.autoSend === true,
      aiDrafts: raw.aiDrafts !== false,
    },
  };
}

export function payUrlFor(invoice: InvoiceRecord) {
  return `${env.keypointAppBaseUrl.replace(/\/$/, '')}/pay/${invoice.publicToken}`;
}

export interface CreateInvoiceRequest {
  caseId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  currency?: string;
  lineItems: InvoiceLineItem[];
  vatRate?: number;
  dueDate?: string;
  summary?: string;
  notes?: string;
  issue?: boolean;
}

function sanitizeLineItems(items: unknown): InvoiceLineItem[] | null {
  if (!Array.isArray(items) || !items.length || items.length > 50) return null;
  const clean: InvoiceLineItem[] = [];
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const description = typeof item.description === 'string' ? item.description.trim().slice(0, 300) : '';
    const quantity = Number(item.quantity);
    const unitAmount = Number(item.unitAmount);
    if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitAmount) || unitAmount < 0) return null;
    clean.push({ description, quantity: round2(quantity), unitAmount: round2(unitAmount) });
  }
  return clean;
}

export async function createInvoice(req: CreateInvoiceRequest): Promise<ActionResult<InvoiceRecord>> {
  const lineItems = sanitizeLineItems(req.lineItems);
  if (!lineItems) return { ok: false, error: 'נדרשת לפחות שורה אחת עם תיאור, כמות ומחיר תקינים' };

  const settings = await getBillingSettings();
  const caseRecord = req.caseId ? await getCase(req.caseId) : undefined;
  if (req.caseId && !caseRecord) return { ok: false, error: 'Case not found' };

  const clientName = (req.clientName || caseRecord?.leadName || '').trim().slice(0, 150);
  if (!clientName) return { ok: false, error: 'שם הלקוח הוא שדה חובה' };
  const clientEmail = (req.clientEmail ?? caseRecord?.email ?? '').trim();
  if (clientEmail && !/^\S+@\S+\.\S+$/.test(clientEmail)) return { ok: false, error: 'אימייל לא תקין' };

  const currency = (req.currency || env.currency || 'ILS').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: 'Invalid currency' };
  const vatRate = typeof req.vatRate === 'number' && Number.isFinite(req.vatRate) && req.vatRate >= 0 && req.vatRate <= 50 ? round2(req.vatRate) : settings.defaultVatRate;
  const totals = computeTotals(lineItems, vatRate);
  if (totals.total <= 0) return { ok: false, error: 'הסכום לתשלום חייב להיות גדול מאפס' };

  const dueAt = req.dueDate && !Number.isNaN(Date.parse(req.dueDate))
    ? new Date(`${req.dueDate.slice(0, 10)}T23:59:59`).toISOString()
    : new Date(Date.now() + settings.defaultDueDays * 86_400_000).toISOString();

  const created = await getStore().createInvoice({
    caseId: caseRecord?.id ?? null,
    clientName,
    clientEmail: clientEmail || undefined,
    clientPhone: (req.clientPhone ?? caseRecord?.phone ?? '').trim() || undefined,
    currency,
    lineItems,
    vatRate,
    ...totals,
    summary: req.summary?.trim().slice(0, 2000) || undefined,
    notes: req.notes?.trim().slice(0, 1000) || undefined,
    status: req.issue ? 'sent' : 'draft',
    issuedAt: req.issue ? new Date().toISOString() : undefined,
    dueAt,
    publicToken: crypto.randomBytes(24).toString('base64url'),
    chasePaused: false,
    sourceAdapter: 'internal',
  });
  if (created.ok && created.data && req.issue) await onIssued(created.data);
  return created;
}

async function onIssued(invoice: InvoiceRecord) {
  if (!invoice.caseId) return;
  await getStore().logActivity(invoice.caseId, 'invoice-issued', `Payment request #${invoice.number} issued`);
  const caseRecord = await getCase(invoice.caseId);
  // A new request on a 'paid' case (e.g. a monthly retainer) reopens billing; finished cases stay put.
  if (caseRecord && !['completed', 'archived'].includes(caseRecord.stage)) {
    await updateCase(invoice.caseId, { stage: 'invoice-sent' });
  }
}

async function onFullyPaid(invoice: InvoiceRecord) {
  if (!invoice.caseId) return;
  await getStore().logActivity(invoice.caseId, 'invoice-paid', `Payment request #${invoice.number} paid in full`);
  const open = await getStore().listInvoices({ caseId: invoice.caseId, statuses: [...OPEN_STATUSES] });
  const caseRecord = await getCase(invoice.caseId);
  if (open.ok && !open.data?.length && caseRecord && ['invoice-sent', 'overdue'].includes(caseRecord.stage)) {
    await updateCase(invoice.caseId, { stage: 'paid' });
  }
}

export async function issueInvoice(id: string): Promise<ActionResult<InvoiceRecord>> {
  const current = await getStore().getInvoice(id);
  if (!current.ok || !current.data) return { ok: false, error: 'Invoice not found' };
  if (current.data.status !== 'draft') return { ok: true, data: current.data };
  const updated = await getStore().updateInvoice(id, { status: 'sent', issuedAt: new Date().toISOString() });
  if (updated.ok && updated.data) await onIssued(updated.data);
  return updated;
}

export async function recordInvoicePayment(id: string, amount: number | undefined, method: string, externalRef?: string) {
  const current = await getStore().getInvoice(id);
  if (!current.ok || !current.data) return { ok: false as const, error: 'Invoice not found' };
  if (current.data.status === 'void') return { ok: false as const, error: 'This payment request was cancelled' };
  const value = round2(amount ?? balanceDue(current.data));
  if (!Number.isFinite(value) || value <= 0) return { ok: false as const, error: 'סכום לא תקין' };

  const wasPaid = current.data.status === 'paid';
  const result = await getStore().recordPayment(id, { amount: value, method: method.slice(0, 40), externalRef });
  if (!result.ok || !result.data) return result;
  if (!wasPaid && result.data.invoice.status === 'paid') await onFullyPaid(result.data.invoice);
  // Stop any reminder still waiting for approval.
  if (result.data.invoice.status === 'paid') await skipPendingRuns(id);
  return result;
}

async function skipPendingRuns(invoiceId: string) {
  const runs = await getStore().listChaseRuns({ invoiceId, status: 'draft' });
  for (const run of runs.data ?? []) await getStore().updateChaseRun(run.id, { status: 'skipped', error: 'Invoice paid' });
}

export async function voidInvoice(id: string) {
  const current = await getStore().getInvoice(id);
  if (!current.ok || !current.data) return { ok: false as const, error: 'Invoice not found' };
  if (current.data.amountPaid > 0) return { ok: false as const, error: 'לא ניתן לבטל דרישה שכבר שולם עליה סכום' };
  const updated = await getStore().updateInvoice(id, { status: 'void', chasePaused: true });
  if (updated.ok) await skipPendingRuns(id);
  return updated;
}

export async function prepareInvoiceMessage(invoice: InvoiceRecord, language: Lang) {
  const branding = await getBranding();
  const payUrl = payUrlFor(invoice);
  const message = invoiceMessage({ invoice, businessName: language === 'he' ? branding.nameHe : branding.name, payUrl, language });
  return {
    ...message,
    payUrl,
    whatsappUrl: whatsappLink(invoice.clientPhone, message.body),
    canEmail: canSendEmail() && Boolean(invoice.clientEmail),
  };
}

export async function emailInvoice(id: string, language: Lang) {
  const current = await getStore().getInvoice(id);
  if (!current.ok || !current.data) return { ok: false as const, error: 'Invoice not found' };
  const invoice = current.data;
  if (!invoice.clientEmail) return { ok: false as const, error: 'ללקוח אין כתובת אימייל' };
  const message = await prepareInvoiceMessage(invoice, language);
  const sent = await sendEmail({ to: invoice.clientEmail, subject: message.subject, text: message.body });
  if (!sent.ok) return { ok: false as const, error: sent.error };
  await issueInvoice(id);
  if (invoice.caseId) await getStore().logActivity(invoice.caseId, 'invoice-emailed', `Payment request #${invoice.number} emailed to ${invoice.clientEmail}`);
  return { ok: true as const, data: { via: sent.via } };
}

// ─── Reminder engine ────────────────────────────────────────────────────────

export interface ChaseSummary {
  checked: number;
  markedOverdue: number;
  drafted: number;
  sent: number;
  failed: number;
  aiDrafted: number;
}

/**
 * One pass of the reminder cadence. For each open, unpaused, past-due invoice it creates the
 * next step's reminder (at most one per run, never while a draft is waiting). With autoSend on
 * and email available it sends immediately; otherwise it queues a draft for approval.
 */
export async function runChase(now = new Date()): Promise<ChaseSummary> {
  const store = getStore();
  const settings = await getBillingSettings();
  const branding = await getBranding();
  const summary: ChaseSummary = { checked: 0, markedOverdue: 0, drafted: 0, sent: 0, failed: 0, aiDrafted: 0 };

  const open = await store.listInvoices({ statuses: [...OPEN_STATUSES] });
  for (let invoice of open.data ?? []) {
    const dueAt = invoice.dueAt ? new Date(invoice.dueAt) : null;
    if (!dueAt || dueAt >= now || balanceDue(invoice) <= 0) continue;
    summary.checked += 1;

    if (invoice.status === 'sent') {
      const updated = await store.updateInvoice(invoice.id, { status: 'overdue' });
      if (updated.ok && updated.data) invoice = updated.data;
      summary.markedOverdue += 1;
      if (invoice.caseId) {
        const caseRecord = await getCase(invoice.caseId);
        if (caseRecord?.stage === 'invoice-sent') await updateCase(invoice.caseId, { stage: 'overdue' });
      }
    }
    if (invoice.chasePaused) continue;

    const runs = (await store.listChaseRuns({ invoiceId: invoice.id })).data ?? [];
    if (runs.some((r) => r.status === 'draft')) continue;
    const stepIndex = runs.filter((r) => r.status === 'sent' || r.status === 'skipped').length;
    const step = settings.cadence[stepIndex];
    if (!step) continue;
    const daysOverdue = daysBetween(dueAt, now);
    if (daysOverdue < step.dayOffset) continue;

    const language: Lang = /[֐-׿]/.test(invoice.clientName) || env.currency === 'ILS' ? 'he' : 'en';
    const draft = await draftReminder(step.tone, {
      invoice,
      businessName: language === 'he' ? branding.nameHe : branding.name,
      payUrl: payUrlFor(invoice),
      language,
      daysOverdue,
    }, settings.aiDrafts);
    if (draft.source === 'ai') summary.aiDrafted += 1;

    const base = { invoiceId: invoice.id, stepIndex, tone: step.tone, subject: draft.subject, body: draft.body };
    if (settings.autoSend && invoice.clientEmail && canSendEmail()) {
      const sent = await sendEmail({ to: invoice.clientEmail, subject: draft.subject, text: draft.body });
      await store.createChaseRun({
        ...base,
        channel: 'email',
        status: sent.ok ? 'sent' : 'failed',
        sentAt: sent.ok ? new Date().toISOString() : undefined,
        error: sent.ok ? undefined : sent.error,
      });
      if (sent.ok) summary.sent += 1;
      else summary.failed += 1;
    } else {
      await store.createChaseRun({ ...base, channel: 'manual', status: 'draft' });
      summary.drafted += 1;
    }
  }
  return summary;
}

/** Approve a queued reminder. 'email' sends it; 'whatsapp' / 'manual' record that staff sent it themselves. */
export async function approveChaseRun(runId: string, channel: 'email' | 'whatsapp' | 'manual', edits?: { subject?: string; body?: string }) {
  const store = getStore();
  const run = (await store.listChaseRuns({ status: 'draft' })).data?.find((r) => r.id === runId);
  if (!run) return { ok: false as const, error: 'Reminder not found or already handled' };
  const invoice = (await store.getInvoice(run.invoiceId)).data;
  if (!invoice) return { ok: false as const, error: 'Invoice not found' };

  const subject = edits?.subject?.trim().slice(0, 150) || run.subject;
  const body = edits?.body?.trim().slice(0, 4000) || run.body;

  if (channel === 'email') {
    if (!invoice.clientEmail) return { ok: false as const, error: 'ללקוח אין כתובת אימייל' };
    const sent = await sendEmail({ to: invoice.clientEmail, subject, text: body });
    if (!sent.ok) {
      await store.updateChaseRun(runId, { error: sent.error });
      return { ok: false as const, error: sent.error };
    }
  }
  const updated = await store.updateChaseRun(runId, { status: 'sent', channel, sentAt: new Date().toISOString(), subject, body });
  if (invoice.caseId) await store.logActivity(invoice.caseId, 'payment-reminder', `Payment reminder (${run.tone}) sent via ${channel} for #${invoice.number}`);
  return updated;
}

export async function skipChaseRun(runId: string) {
  return getStore().updateChaseRun(runId, { status: 'skipped' });
}

export interface ReminderQueueItem extends ChaseRun {
  invoice: Pick<InvoiceRecord, 'id' | 'number' | 'clientName' | 'clientEmail' | 'clientPhone' | 'currency' | 'total' | 'amountPaid' | 'dueAt' | 'caseId'>;
  whatsappUrl: string | null;
}

export async function listReminderQueue(): Promise<ReminderQueueItem[]> {
  const store = getStore();
  const runs = (await store.listChaseRuns({ status: 'draft' })).data ?? [];
  const items: ReminderQueueItem[] = [];
  for (const run of runs) {
    const invoice = (await store.getInvoice(run.invoiceId)).data;
    if (!invoice) continue;
    items.push({
      ...run,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientPhone: invoice.clientPhone,
        currency: invoice.currency,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        dueAt: invoice.dueAt,
        caseId: invoice.caseId,
      },
      whatsappUrl: whatsappLink(invoice.clientPhone, run.body),
    });
  }
  return items;
}
