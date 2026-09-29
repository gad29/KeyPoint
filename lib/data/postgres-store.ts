import type { BankOffer, BorrowerProfile, CaseRecord, CaseStage, CaseType } from '@/data/domain';
import { env } from '@/lib/env';
import { normalizeStaffRole } from '@/lib/staff-roles';
import { getSql } from '@/lib/data/postgres-client';
import type { CaseDocumentRecord, DataStore, FinanceTransactionRow } from '@/lib/data/types';
import type { ActionResult, UploadRecord } from '@/lib/types';

type Row = Record<string, unknown>;

let agencyIdPromise: Promise<string> | null = null;

/** Resolves (and on first use creates) the agency row this deployment serves. */
function getAgencyId(): Promise<string> {
  if (!agencyIdPromise) {
    agencyIdPromise = (async () => {
      const sql = getSql();
      await sql`
        insert into agencies (slug, name, name_he, preset, currency)
        values (${env.agencySlug}, ${env.businessName || 'My business'}, ${env.businessNameHe || null}, ${env.preset}, ${env.currency})
        on conflict (slug) do nothing`;
      const [row] = await sql`select id from agencies where slug = ${env.agencySlug}`;
      return String(row.id);
    })().catch((error) => {
      agencyIdPromise = null;
      throw error;
    });
  }
  return agencyIdPromise;
}

function fail<T>(error: unknown, fallback: string): ActionResult<T> {
  const message = error instanceof Error ? error.message : fallback;
  console.error(`[AgencyOS Postgres] ${fallback}: ${message}`);
  return { ok: false, error: fallback };
}

function iso(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' && value ? value : undefined;
}

function mapCase(row: Row): CaseRecord {
  return {
    id: String(row.case_number),
    leadName: String(row.lead_name),
    spouseName: (row.spouse_name as string) || undefined,
    phone: String(row.phone),
    email: (row.email as string) || undefined,
    stage: row.stage as CaseStage,
    caseType: row.case_type as CaseType,
    borrowerProfiles: (row.borrower_profiles as BorrowerProfile[]) || [],
    missingItems: Number(row.missing_items) || 0,
    assignedTo: String(row.assigned_to || 'Unassigned'),
    bankTargets: (row.bank_targets as string[]) || [],
    nextAction: String(row.next_action || ''),
    portalStatus: (row.portal_status as string) || undefined,
  };
}

function mapDocument(row: Row, caseId: string): CaseDocumentRecord {
  return {
    recordId: String(row.id),
    caseId,
    documentCode: String(row.document_code),
    status: String(row.status),
    uploadedFileUrl: (row.uploaded_file_url as string) || undefined,
    reviewNotes: (row.review_notes as string) || undefined,
    approvedAt: iso(row.approved_at),
  };
}

async function caseUuid(caseId: string): Promise<string | null> {
  const sql = getSql();
  const agencyId = await getAgencyId();
  const [row] = await sql`select id from cases where agency_id = ${agencyId} and case_number = ${caseId}`;
  return row ? String(row.id) : null;
}

export const postgresStore: DataStore = {
  kind: 'postgres',

  async listCases() {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const rows = await sql`select * from cases where agency_id = ${agencyId} order by lead_name asc`;
      return { ok: true, data: rows.map(mapCase) };
    } catch (error) {
      return fail(error, 'Failed to list cases');
    }
  },

  async getCase(caseId) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const [row] = await sql`select * from cases where agency_id = ${agencyId} and case_number = ${caseId}`;
      return row ? { ok: true, data: mapCase(row) } : { ok: false, error: 'Case not found' };
    } catch (error) {
      return fail(error, 'Failed to load case');
    }
  },

  async createCase(input) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const row = await sql.begin(async (tx) => {
        const [seq] = await tx`update agencies set case_seq = case_seq + 1 where id = ${agencyId} returning case_seq`;
        const source = input.source ? `\n\nSource: ${input.source}` : '';
        const [created] = await tx`
          insert into cases (
            agency_id, case_number, lead_name, spouse_name, phone, email, stage, case_type,
            borrower_profiles, missing_items, assigned_to, next_action, portal_status, notes,
            source, submission_id, answers
          ) values (
            ${agencyId}, ${`CASE-${seq.case_seq}`}, ${input.leadName}, ${input.spouseName || null},
            ${input.phone}, ${input.email || null}, ${input.stage || 'new-lead'}, ${input.caseType},
            ${input.borrowerProfiles}::text[], ${input.missingItemsCount ?? 0}, ${input.assignedTo || 'Unassigned'},
            ${input.nextAction || 'Review intake and move the case forward.'}, ${input.portalStatus || 'not-invited'},
            ${`${input.notes || ''}${source}`.trim()}, ${input.source || null}, ${input.submissionId || null},
            ${input.answers === undefined ? null : JSON.stringify(input.answers)}::jsonb
          )
          returning *`;
        return created;
      });
      return { ok: true, data: mapCase(row) };
    } catch (error) {
      return fail(error, 'Failed to create case');
    }
  },

  async updateCase(caseId, input) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const notesAppend = input.notesAppend?.trim() || null;
      const [row] = await sql`
        update cases set
          stage = coalesce(${input.stage ?? null}, stage),
          assigned_to = coalesce(${input.assignedTo ?? null}, assigned_to),
          portal_status = coalesce(${input.portalStatus ?? null}, portal_status),
          next_action = coalesce(${input.nextAction ?? null}, next_action),
          missing_items = coalesce(${input.missingItemsCount ?? null}::int, missing_items),
          notes = case when ${notesAppend}::text is null then notes
                       else trim(both from notes || E'\n\n' || ${notesAppend}::text) end,
          updated_at = now()
        where agency_id = ${agencyId} and case_number = ${caseId}
        returning *`;
      return row ? { ok: true, data: mapCase(row) } : { ok: false, error: 'Case not found' };
    } catch (error) {
      return fail(error, 'Failed to update case');
    }
  },

  async addCaseContact(caseId, contact) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const id = await caseUuid(caseId);
      if (!id) return { ok: false, error: 'Case not found' };
      const [row] = await sql`
        insert into case_contacts (agency_id, case_id, full_name, id_number, preferred_language, phone, email, role)
        values (${agencyId}, ${id}, ${contact.fullName}, ${contact.idNumber || null}, ${contact.preferredLanguage || null},
                ${contact.phone || null}, ${contact.email || null}, ${contact.role || 'primary'})
        returning id`;
      return { ok: true, data: { id: String(row.id) } };
    } catch (error) {
      return fail(error, 'Failed to add case contact');
    }
  },

  async findCaseByContactIdNumber(idNumber) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const [row] = await sql`
        select c.case_number, c.lead_name, c.stage
        from case_contacts cc join cases c on c.id = cc.case_id
        where cc.agency_id = ${agencyId} and cc.id_number = ${idNumber}
        order by c.created_at desc limit 1`;
      if (!row) return { ok: true, data: null };
      return { ok: true, data: { caseId: String(row.case_number), leadName: String(row.lead_name), stage: row.stage as CaseStage } };
    } catch (error) {
      return fail(error, 'Failed to look up case');
    }
  },

  async logActivity(caseId, eventType, summary, actor = 'Agency OS app') {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const id = await caseUuid(caseId);
      const [row] = await sql`
        insert into activity_log (agency_id, case_id, actor, event_type, summary)
        values (${agencyId}, ${id}, ${actor}, ${eventType}, ${summary})
        returning id`;
      return { ok: true, data: { id: String(row.id) } };
    } catch (error) {
      return fail(error, 'Failed to write activity log');
    }
  },

  async seedCaseDocuments(caseId, documentCodes) {
    if (!documentCodes.length) return { ok: true, data: [] };
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const id = await caseUuid(caseId);
      if (!id) return { ok: false, error: 'Case not found' };
      await sql`
        insert into case_documents (agency_id, case_id, document_code, required, status)
        select ${agencyId}, ${id}, code, true, 'not-uploaded' from unnest(${documentCodes}::text[]) as code`;
      return { ok: true, data: documentCodes };
    } catch (error) {
      return fail(error, 'Failed to seed case documents');
    }
  },

  async createCaseDocument(caseId, documentCode, fileUrl, status = 'uploaded') {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const id = await caseUuid(caseId);
      if (!id) return { ok: false, error: 'Case not found' };
      const [existing] = await sql`
        update case_documents set status = ${status}, uploaded_file_url = ${fileUrl}
        where case_id = ${id} and document_code = ${documentCode}
        returning id`;
      if (existing) return { ok: true, data: { id: String(existing.id) } };
      const [row] = await sql`
        insert into case_documents (agency_id, case_id, document_code, status, uploaded_file_url)
        values (${agencyId}, ${id}, ${documentCode}, ${status}, ${fileUrl})
        returning id`;
      return { ok: true, data: { id: String(row.id) } };
    } catch (error) {
      return fail(error, 'Failed to save case document');
    }
  },

  async listCaseDocuments(caseId) {
    try {
      const sql = getSql();
      const id = await caseUuid(caseId);
      if (!id) return { ok: true, data: [] };
      const rows = await sql`select * from case_documents where case_id = ${id} order by created_at asc`;
      return { ok: true, data: rows.map((row) => mapDocument(row, caseId)) };
    } catch (error) {
      return fail(error, 'Failed to list case documents');
    }
  },

  async updateCaseDocumentStatus(caseId, documentCode, status, reviewNote) {
    try {
      const sql = getSql();
      const id = await caseUuid(caseId);
      if (!id) return { ok: false, error: 'Case not found' };
      const [row] = await sql`
        update case_documents set
          status = ${status},
          review_notes = coalesce(${reviewNote ?? null}, review_notes),
          approved_at = case when ${status} = 'approved' then now() else approved_at end,
          requested_resubmission_at = case when ${status} = 'resubmit-needed' then now() else requested_resubmission_at end
        where case_id = ${id} and document_code = ${documentCode}
        returning *`;
      if (!row) return { ok: false, error: `Document ${documentCode} not found for case ${caseId}` };
      return { ok: true, data: mapDocument(row, caseId) };
    } catch (error) {
      return fail(error, 'Failed to update document status');
    }
  },

  async recordUpload(record) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const id = await caseUuid(record.caseId);
      if (!id) return { ok: false, error: 'Case not found' };
      const [row] = await sql`
        insert into uploads (agency_id, case_id, document_code, file_name, path, uploaded_at)
        values (${agencyId}, ${id}, ${record.documentCode}, ${record.fileName}, ${record.path}, ${record.uploadedAt})
        returning id`;
      return { ok: true, data: { id: String(row.id) } };
    } catch (error) {
      return fail(error, 'Failed to record upload');
    }
  },

  async listUploads(caseId) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const rows = caseId
        ? await sql`select u.*, c.case_number from uploads u join cases c on c.id = u.case_id
                    where u.agency_id = ${agencyId} and c.case_number = ${caseId} order by u.uploaded_at desc`
        : await sql`select u.*, c.case_number from uploads u join cases c on c.id = u.case_id
                    where u.agency_id = ${agencyId} order by u.uploaded_at desc`;
      return rows.map((row): UploadRecord => ({
        id: String(row.id),
        caseId: String(row.case_number),
        documentCode: String(row.document_code),
        fileName: String(row.file_name),
        path: String(row.path),
        uploadedAt: iso(row.uploaded_at) || '',
      }));
    } catch (error) {
      fail(error, 'Failed to list uploads');
      return [];
    }
  },

  async listBankOffers(caseId) {
    try {
      const sql = getSql();
      const id = await caseUuid(caseId);
      if (!id) return { ok: true, data: [] };
      const rows = await sql`select * from bank_offers where case_id = ${id} order by bank asc`;
      return {
        ok: true,
        data: rows.map((row): BankOffer => ({
          bank: String(row.bank),
          status: row.status as BankOffer['status'],
          firstPayment: (row.first_payment as string) || undefined,
          maxPayment: (row.max_payment as string) || undefined,
          totalRepayment: (row.total_repayment as string) || undefined,
          expiresAt: (row.expires_at as string) || undefined,
        })),
      };
    } catch (error) {
      return fail(error, 'Failed to list bank offers');
    }
  },

  async createBankOffer(input) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const id = await caseUuid(input.caseId);
      if (!id) return { ok: false, error: 'Case not found' };
      const [row] = await sql`
        insert into bank_offers (agency_id, case_id, bank, status, first_payment, max_payment, total_repayment, expires_at)
        values (${agencyId}, ${id}, ${input.bank}, ${input.status}, ${input.firstPayment || null},
                ${input.maxPayment || null}, ${input.totalRepayment || null}, ${input.expiresAt || null})
        returning id`;
      return { ok: true, data: { id: String(row.id) } };
    } catch (error) {
      return fail(error, 'Failed to save bank offer');
    }
  },

  async createAiReviewStub(caseId, triggeredBy, payloadRef) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const id = await caseUuid(caseId);
      const [row] = await sql`
        insert into ai_reviews (agency_id, case_id, triggered_by, payload_ref)
        values (${agencyId}, ${id}, ${triggeredBy}, ${payloadRef})
        returning id`;
      return { ok: true, data: { id: String(row.id) } };
    } catch (error) {
      return fail(error, 'Failed to create AI review stub');
    }
  },

  async findStaffByEmail(email) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const [row] = await sql`
        select * from users where agency_id = ${agencyId} and lower(email) = ${email.trim().toLowerCase()}`;
      if (!row) return { ok: false, error: 'Invalid email or password' };
      return {
        ok: true,
        data: {
          recordId: String(row.id),
          email: String(row.email),
          passwordHash: String(row.password_hash),
          fullName: String(row.full_name || ''),
          active: Boolean(row.active),
          role: normalizeStaffRole(String(row.role)),
        },
      };
    } catch (error) {
      return fail(error, 'Failed to look up staff user');
    }
  },

  async createStaff(input) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const [row] = await sql`
        insert into users (agency_id, email, password_hash, full_name, role)
        values (${agencyId}, ${input.email.trim().toLowerCase()}, ${input.passwordHash},
                ${input.fullName?.trim() || null}, ${normalizeStaffRole(input.role)})
        returning id`;
      return { ok: true, data: { id: String(row.id) } };
    } catch (error) {
      return fail(error, 'Failed to create staff user');
    }
  },

  async updateStaffPasswordHash(recordId, passwordHash) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const [row] = await sql`
        update users set password_hash = ${passwordHash}
        where agency_id = ${agencyId} and id = ${recordId}
        returning id`;
      return row ? { ok: true, data: { id: String(row.id) } } : { ok: false, error: 'User not found' };
    } catch (error) {
      return fail(error, 'Failed to update password');
    }
  },

  async listStaff() {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const rows = await sql`select * from users where agency_id = ${agencyId} order by lower(email) asc`;
      return {
        ok: true,
        data: rows.map((row) => ({
          recordId: String(row.id),
          email: String(row.email),
          fullName: String(row.full_name || ''),
          active: Boolean(row.active),
          role: normalizeStaffRole(String(row.role)),
        })),
      };
    } catch (error) {
      return fail(error, 'Failed to load staff');
    }
  },

  async listRecentFinanceTransactions() {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const rows = await sql`
        select * from finance_transactions
        where agency_id = ${agencyId} and occurred_on >= current_date - 90
        order by occurred_on desc, created_at desc limit 300`;
      return {
        ok: true,
        data: rows.map((row): FinanceTransactionRow => ({
          id: String(row.id),
          type: row.type as FinanceTransactionRow['type'],
          amount: Number(row.amount),
          category: String(row.category),
          description: String(row.description),
          caseId: String(row.case_ref || ''),
          dateMs: new Date(row.occurred_on as string | Date).getTime(),
        })),
      };
    } catch (error) {
      return fail(error, 'Failed to load finance data');
    }
  },

  async createFinanceTransaction(input) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const [row] = await sql`
        insert into finance_transactions (agency_id, type, amount, category, description, case_ref, occurred_on)
        values (${agencyId}, ${input.type}, ${input.amount}, ${input.category}, ${input.description || ''},
                ${input.caseId || null}, ${input.date})
        returning id`;
      return { ok: true, data: { id: String(row.id) } };
    } catch (error) {
      return fail(error, 'Failed to create transaction');
    }
  },

  async logBillingEvent(input) {
    try {
      const sql = getSql();
      const agencyId = await getAgencyId();
      const notes = [input.notes, input.triggeredByEmail ? `By: ${input.triggeredByEmail}` : ''].filter(Boolean).join('\n');
      const [row] = await sql`
        insert into billing_events (agency_id, kind, target_email, case_ref, amount, notes)
        values (${agencyId}, ${input.kind}, ${input.targetEmail || null}, ${input.caseId || null},
                ${typeof input.amount === 'number' && Number.isFinite(input.amount) ? input.amount : null}, ${notes || null})
        returning id`;
      return { ok: true, data: { id: String(row.id) } };
    } catch (error) {
      return fail(error, 'Failed to log billing event');
    }
  },
};
