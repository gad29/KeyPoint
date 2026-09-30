import type { ChaseRun, InvoicePayment, InvoiceRecord } from '@/data/domain';
import { getSql } from '@/lib/data/postgres-client';
import { caseUuid, fail, getAgencyId, iso, jsonb, UUID_RE, type Row } from '@/lib/data/postgres-shared';
import type { BillingSettings, BillingStore } from '@/lib/billing/types';

const INVOICE_SELECT = `
  select i.*, c.case_number
  from invoices i left join cases c on c.id = i.case_id`;

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapInvoice(row: Row): InvoiceRecord {
  return {
    id: String(row.id),
    caseId: (row.case_number as string) || null,
    number: String(row.number),
    clientName: String(row.client_name || ''),
    clientEmail: (row.client_email as string) || undefined,
    clientPhone: (row.client_phone as string) || undefined,
    currency: String(row.currency),
    lineItems: (row.line_items as InvoiceRecord['lineItems']) || [],
    vatRate: num(row.vat_rate),
    subtotal: num(row.subtotal),
    vatAmount: num(row.vat_amount),
    total: num(row.total),
    amountPaid: num(row.amount_paid),
    summary: (row.summary as string) || undefined,
    notes: (row.notes as string) || undefined,
    status: row.status as InvoiceRecord['status'],
    issuedAt: iso(row.issued_at),
    dueAt: iso(row.due_at),
    paidAt: iso(row.paid_at),
    viewedAt: iso(row.viewed_at),
    createdAt: iso(row.created_at) || '',
    publicToken: String(row.public_token || ''),
    chasePaused: Boolean(row.chase_paused),
    sourceAdapter: String(row.source_adapter || 'internal'),
    externalId: (row.external_id as string) || undefined,
    externalDocUrl: (row.external_doc_url as string) || undefined,
  };
}

function mapRun(row: Row): ChaseRun {
  return {
    id: String(row.id),
    invoiceId: String(row.invoice_id),
    stepIndex: Number(row.step_index),
    tone: row.tone as ChaseRun['tone'],
    channel: row.channel as ChaseRun['channel'],
    status: row.status as ChaseRun['status'],
    subject: String(row.subject || ''),
    body: String(row.body || ''),
    createdAt: iso(row.created_at) || '',
    sentAt: iso(row.sent_at),
    error: (row.error as string) || undefined,
  };
}

async function loadInvoice(id: string): Promise<InvoiceRecord | null> {
  const sql = getSql();
  const agencyId = await getAgencyId();
  const [row] = await sql.unsafe(`${INVOICE_SELECT} where i.agency_id = $1 and i.id = $2`, [agencyId, id]);
  return row ? mapInvoice(row) : null;
}

export const postgresBilling: BillingStore = {
  async listInvoices(filter = {}) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const statuses = filter.statuses?.length ? filter.statuses : null;
      const rows = await sql`
        select i.*, c.case_number from invoices i left join cases c on c.id = i.case_id
        where i.agency_id = ${agencyId}
          and (${filter.caseId ?? null}::text is null or c.case_number = ${filter.caseId ?? null})
          and (${statuses}::text[] is null or i.status = any(${statuses}::text[]))
        order by i.created_at desc
        limit 500`;
      return { ok: true, data: rows.map(mapInvoice) };
    } catch (error) {
      return fail(error, 'Failed to list invoices');
    }
  },

  async getInvoice(id) {
    if (!UUID_RE.test(id)) return { ok: true, data: null };
    try {
      return { ok: true, data: await loadInvoice(id) };
    } catch (error) {
      return fail(error, 'Failed to load invoice');
    }
  },

  async getInvoiceByToken(token) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const [row] = await sql.unsafe(`${INVOICE_SELECT} where i.agency_id = $1 and i.public_token = $2`, [agencyId, token]);
      return { ok: true, data: row ? mapInvoice(row) : null };
    } catch (error) {
      return fail(error, 'Failed to load invoice');
    }
  },

  async createInvoice(input) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const caseId = input.caseId ? await caseUuid(input.caseId) : null;
      if (input.caseId && !caseId) return { ok: false, error: 'Case not found' };
      const id = await sql.begin(async (tx) => {
        const [seq] = await tx`update agencies set invoice_seq = invoice_seq + 1 where id = ${agencyId} returning invoice_seq`;
        const [row] = await tx`
          insert into invoices (
            agency_id, case_id, number, client_name, client_email, client_phone, currency, line_items,
            vat_rate, subtotal, vat_amount, total, summary, notes, status, issued_at, due_at,
            public_token, chase_paused, source_adapter
          ) values (
            ${agencyId}, ${caseId}, ${String(seq.invoice_seq)}, ${input.clientName}, ${input.clientEmail || null},
            ${input.clientPhone || null}, ${input.currency}, ${jsonb(input.lineItems)}, ${input.vatRate},
            ${input.subtotal}, ${input.vatAmount}, ${input.total}, ${input.summary || null}, ${input.notes || null},
            ${input.status}, ${input.issuedAt || null}, ${input.dueAt || null}, ${input.publicToken},
            ${input.chasePaused}, ${input.sourceAdapter}
          )
          returning id`;
        return String(row.id);
      });
      const created = await loadInvoice(id);
      return created ? { ok: true, data: created } : { ok: false, error: 'Invoice not found after insert' };
    } catch (error) {
      return fail(error, 'Failed to create invoice');
    }
  },

  async updateInvoice(id, patch) {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invoice not found' };
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const has = (key: keyof typeof patch) => Object.prototype.hasOwnProperty.call(patch, key);
      const [row] = await sql`
        update invoices set
          status = case when ${has('status')} then ${patch.status ?? null} else status end,
          issued_at = case when ${has('issuedAt')} then ${patch.issuedAt ?? null}::timestamptz else issued_at end,
          due_at = case when ${has('dueAt')} then ${patch.dueAt ?? null}::timestamptz else due_at end,
          paid_at = case when ${has('paidAt')} then ${patch.paidAt ?? null}::timestamptz else paid_at end,
          viewed_at = case when ${has('viewedAt')} then ${patch.viewedAt ?? null}::timestamptz else viewed_at end,
          chase_paused = case when ${has('chasePaused')} then ${patch.chasePaused ?? false} else chase_paused end,
          source_adapter = case when ${has('sourceAdapter')} then ${patch.sourceAdapter ?? 'internal'} else source_adapter end,
          external_id = case when ${has('externalId')} then ${patch.externalId ?? null} else external_id end,
          external_doc_url = case when ${has('externalDocUrl')} then ${patch.externalDocUrl ?? null} else external_doc_url end,
          client_email = case when ${has('clientEmail')} then ${patch.clientEmail ?? null} else client_email end,
          client_phone = case when ${has('clientPhone')} then ${patch.clientPhone ?? null} else client_phone end,
          summary = case when ${has('summary')} then ${patch.summary ?? null} else summary end,
          notes = case when ${has('notes')} then ${patch.notes ?? null} else notes end,
          updated_at = now()
        where agency_id = ${agencyId} and id = ${id}
        returning id`;
      if (!row) return { ok: false, error: 'Invoice not found' };
      const updated = await loadInvoice(id);
      return updated ? { ok: true, data: updated } : { ok: false, error: 'Invoice not found' };
    } catch (error) {
      return fail(error, 'Failed to update invoice');
    }
  },

  async recordPayment(invoiceId, payment) {
    if (!UUID_RE.test(invoiceId)) return { ok: false, error: 'Invoice not found' };
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const duplicate = await sql.begin(async (tx) => {
        const [inserted] = await tx`
          insert into invoice_payments (agency_id, invoice_id, amount, method, external_ref)
          select ${agencyId}, id, ${payment.amount}, ${payment.method}, ${payment.externalRef || null}
          from invoices where agency_id = ${agencyId} and id = ${invoiceId}
          on conflict (external_ref) where external_ref is not null do nothing
          returning id`;
        if (!inserted) return true;
        await tx`
          update invoices i set
            amount_paid = p.sum,
            status = case when p.sum >= i.total then 'paid' when p.sum > 0 then 'partial' else i.status end,
            paid_at = case when p.sum >= i.total then coalesce(i.paid_at, now()) else i.paid_at end,
            updated_at = now()
          from (select coalesce(sum(amount), 0) as sum from invoice_payments where invoice_id = ${invoiceId}) p
          where i.id = ${invoiceId}`;
        return false;
      });
      const invoice = await loadInvoice(invoiceId);
      if (!invoice) return { ok: false, error: 'Invoice not found' };
      return { ok: true, data: { invoice, duplicate } };
    } catch (error) {
      return fail(error, 'Failed to record payment');
    }
  },

  async listPayments(invoiceId) {
    if (!UUID_RE.test(invoiceId)) return { ok: true, data: [] };
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const rows = await sql`
        select * from invoice_payments where agency_id = ${agencyId} and invoice_id = ${invoiceId} order by paid_at asc`;
      return {
        ok: true,
        data: rows.map((row): InvoicePayment => ({
          id: String(row.id),
          invoiceId,
          amount: num(row.amount),
          method: String(row.method || ''),
          externalRef: (row.external_ref as string) || undefined,
          paidAt: iso(row.paid_at) || '',
        })),
      };
    } catch (error) {
      return fail(error, 'Failed to list payments');
    }
  },

  async listChaseRuns(filter = {}) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const invoiceId = filter.invoiceId && UUID_RE.test(filter.invoiceId) ? filter.invoiceId : null;
      if (filter.invoiceId && !invoiceId) return { ok: true, data: [] };
      const rows = await sql`
        select * from chase_runs
        where agency_id = ${agencyId}
          and (${invoiceId}::uuid is null or invoice_id = ${invoiceId})
          and (${filter.status ?? null}::text is null or status = ${filter.status ?? null})
        order by created_at desc
        limit 500`;
      return { ok: true, data: rows.map(mapRun) };
    } catch (error) {
      return fail(error, 'Failed to list reminders');
    }
  },

  async createChaseRun(run) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const [row] = await sql`
        insert into chase_runs (agency_id, invoice_id, step_index, tone, channel, status, subject, body, sent_at, error)
        values (${agencyId}, ${run.invoiceId}, ${run.stepIndex}, ${run.tone}, ${run.channel}, ${run.status},
                ${run.subject}, ${run.body}, ${run.sentAt ?? null}, ${run.error ?? null})
        returning *`;
      return { ok: true, data: mapRun(row) };
    } catch (error) {
      return fail(error, 'Failed to save reminder');
    }
  },

  async updateChaseRun(id, patch) {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Reminder not found' };
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const [row] = await sql`
        update chase_runs set
          status = coalesce(${patch.status ?? null}, status),
          channel = coalesce(${patch.channel ?? null}, channel),
          sent_at = coalesce(${patch.sentAt ?? null}::timestamptz, sent_at),
          error = coalesce(${patch.error ?? null}, error),
          subject = coalesce(${patch.subject ?? null}, subject),
          body = coalesce(${patch.body ?? null}, body)
        where agency_id = ${agencyId} and id = ${id}
        returning *`;
      return row ? { ok: true, data: mapRun(row) } : { ok: false, error: 'Reminder not found' };
    } catch (error) {
      return fail(error, 'Failed to update reminder');
    }
  },

  async getBillingSettings() {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const [row] = await sql`select billing_settings from agencies where id = ${agencyId}`;
      return { ok: true, data: (row?.billing_settings as Partial<BillingSettings>) || {} };
    } catch (error) {
      return fail(error, 'Failed to load billing settings');
    }
  },

  async saveBillingSettings(settings) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      await sql`update agencies set billing_settings = ${jsonb(settings)} where id = ${agencyId}`;
      return { ok: true, data: settings };
    } catch (error) {
      return fail(error, 'Failed to save billing settings');
    }
  },
};
