import { env, hasAirtableConfig } from '@/lib/env';
import type { CaseRecord, CaseStage, CaseType, BorrowerProfile } from '@/data/domain';
import type { ActionResult, CreateCaseInput } from '@/lib/types';

const apiBase = 'https://api.airtable.com/v0';

type AirtableRecord<T = Record<string, unknown>> = {
  id: string;
  fields: T;
  createdTime?: string;
};

type AirtableListResponse<T = Record<string, unknown>> = {
  records: Array<AirtableRecord<T>>;
  offset?: string;
};

type AirtableCaseFields = Record<string, unknown>;

type AirtableCaseEntity = {
  recordId: string;
  case: CaseRecord;
};

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeStage(value: unknown): CaseStage {
  const raw = asString(value, 'new-lead').trim().toLowerCase().replace(/\s+/g, '-') as CaseStage;
  const allowed: CaseStage[] = [
    'new-lead',
    'intake-submitted',
    'approved',
    'portal-activated',
    'documents-in-progress',
    'secretary-review',
    'waiting-appraiser',
    'appraisal-received',
    'ready-for-bank',
    'bank-negotiation',
    'recommendation-prepared',
    'completed',
  ];
  return allowed.includes(raw) ? raw : 'new-lead';
}

function normalizeCaseType(value: unknown): CaseType {
  const raw = asString(value, 'purchase-single-dwelling').trim().toLowerCase().replace(/\s+/g, '-') as CaseType;
  const allowed: CaseType[] = [
    'purchase-single-dwelling',
    'purchase-replacement-dwelling',
    'purchase-investment-dwelling',
    'refinance',
    'all-purpose-against-home',
    'discounted-program',
    'self-build',
    'renovation',
  ];
  return allowed.includes(raw) ? raw : 'purchase-single-dwelling';
}

function normalizeBorrowerProfiles(value: unknown): BorrowerProfile[] {
  const allowed: BorrowerProfile[] = [
    'salaried',
    'self-employed',
    'student',
    'benefits',
    'pensioner',
    'new-immigrant',
    'foreign-income',
  ];

  return asStringArray(value).filter((item): item is BorrowerProfile => allowed.includes(item as BorrowerProfile));
}

async function airtableRequest<T = Record<string, unknown>>(
  tableOrPath: string,
  init?: RequestInit,
  searchParams?: URLSearchParams,
): Promise<ActionResult<T>> {
  if (!hasAirtableConfig()) {
    return { ok: false, error: 'Airtable is not configured' };
  }

  const url = new URL(`${apiBase}/${env.airtableBaseId}/${tableOrPath}`);
  if (searchParams) {
    searchParams.forEach((value, key) => url.searchParams.set(key, value));
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.airtableApiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    return { ok: false, error: `Airtable request failed with ${res.status}` };
  }

  return { ok: true, data: (await res.json()) as T };
}

export async function listAirtableRecords<T = Record<string, unknown>>(
  table: string,
  params?: Record<string, string>,
): Promise<ActionResult<Array<AirtableRecord<T>>>> {
  const searchParams = new URLSearchParams(params);
  const all: Array<AirtableRecord<T>> = [];
  let offset: string | undefined;

  do {
    if (offset) searchParams.set('offset', offset);
    const result = await airtableRequest<AirtableListResponse<T>>(encodeURIComponent(table), undefined, searchParams);
    if (!result.ok || !result.data) return { ok: false, error: result.error || 'Failed to list Airtable records' };
    all.push(...result.data.records);
    offset = result.data.offset;
  } while (offset);

  return { ok: true, data: all };
}

export async function createAirtableRecord<T = Record<string, unknown>>(table: string, fields: T) {
  return airtableRequest<{ id: string; fields: T }>(encodeURIComponent(table), {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
}

export async function updateAirtableRecord<T = Record<string, unknown>>(table: string, recordId: string, fields: T) {
  return airtableRequest<{ id: string; fields: T }>(`${encodeURIComponent(table)}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

export async function findAirtableRecordByField<T = Record<string, unknown>>(table: string, fieldName: string, value: string) {
  const escaped = value.replace(/'/g, "\\'");
  const result = await listAirtableRecords<T>(table, {
    filterByFormula: `{${fieldName}}='${escaped}'`,
    maxRecords: '1',
  });

  if (!result.ok || !result.data?.length) {
    return { ok: false, error: result.error || 'Record not found' } as const;
  }

  return { ok: true, data: result.data[0] } as const;
}

function mapAirtableCase(record: AirtableRecord<AirtableCaseFields>): CaseRecord {
  const fields = record.fields;
  const caseId = asString(fields['Case ID'], record.id);

  return {
    id: caseId,
    leadName: asString(fields['Lead name'], 'Unknown lead'),
    spouseName: isString(fields['Spouse name']) ? fields['Spouse name'] : undefined,
    phone: asString(fields['Phone']),
    email: isString(fields['Email']) ? fields['Email'] : undefined,
    stage: normalizeStage(fields['Current stage']),
    caseType: normalizeCaseType(fields['Case type']),
    borrowerProfiles: normalizeBorrowerProfiles(fields['Borrower profiles']),
    missingItems: asNumber(fields['Missing items count']),
    assignedTo: asString(fields['Assigned staff'], 'Unassigned'),
    bankTargets: asStringArray(fields['Bank targets']),
    nextAction: asString(fields['Next action'], 'Review case in office dashboard.'),
    portalStatus: isString(fields['Client portal status']) ? fields['Client portal status'] : undefined,
    airtableRecordId: record.id,
  };
}

function makeCaseId() {
  const serial = Math.floor(1000 + Math.random() * 9000);
  return `CASE-${serial}`;
}

function mapCreateCaseFields(input: CreateCaseInput) {
  return {
    'Case ID': makeCaseId(),
    'Lead name': input.leadName,
    'Spouse name': input.spouseName || '',
    Phone: input.phone,
    Email: input.email || '',
    'Case type': input.caseType,
    'Borrower profiles': input.borrowerProfiles,
    'Current stage': 'new-lead',
    'Assigned staff': input.assignedTo || 'Unassigned',
    'Missing items count': 0,
    'Client portal status': 'not-invited',
    'Fillout submission id': input.filloutSubmissionId || '',
    Notes: input.notes || '',
  };
}

export async function listAirtableCases(): Promise<ActionResult<CaseRecord[]>> {
  const result = await listAirtableRecords<AirtableCaseFields>(env.airtableCasesTable, {
    'sort[0][field]': 'Lead name',
    'sort[0][direction]': 'asc',
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error || 'Failed to list Airtable cases' };
  }

  return { ok: true, data: result.data.map(mapAirtableCase) };
}

export async function getAirtableCaseEntityByCaseId(caseId: string): Promise<ActionResult<AirtableCaseEntity>> {
  const result = await findAirtableRecordByField<AirtableCaseFields>(env.airtableCasesTable, 'Case ID', caseId);
  if (!result.ok || !result.data) {
    return { ok: false, error: result.error || 'Case not found in Airtable' };
  }

  return {
    ok: true,
    data: {
      recordId: result.data.id,
      case: mapAirtableCase(result.data),
    },
  };
}

export async function getAirtableCaseByCaseId(caseId: string): Promise<ActionResult<CaseRecord>> {
  const result = await getAirtableCaseEntityByCaseId(caseId);
  if (!result.ok || !result.data) return { ok: false, error: result.error || 'Case not found in Airtable' };
  return { ok: true, data: result.data.case };
}

export async function createAirtableCase(input: CreateCaseInput): Promise<ActionResult<CaseRecord>> {
  const created = await createAirtableRecord(env.airtableCasesTable, mapCreateCaseFields(input));
  if (!created.ok || !created.data) {
    return { ok: false, error: created.error || 'Failed to create Airtable case' };
  }

  const record = { id: created.data.id, fields: created.data.fields } satisfies AirtableRecord<AirtableCaseFields>;
  return { ok: true, data: mapAirtableCase(record) };
}

export async function updateAirtableCaseStage(caseId: string, stage: CaseStage): Promise<ActionResult<CaseRecord>> {
  const entity = await getAirtableCaseEntityByCaseId(caseId);
  if (!entity.ok || !entity.data) return { ok: false, error: entity.error || 'Case not found' };

  const updated = await updateAirtableRecord(env.airtableCasesTable, entity.data.recordId, { 'Current stage': stage });
  if (!updated.ok || !updated.data) return { ok: false, error: updated.error || 'Failed to update case stage' };

  const record = { id: updated.data.id, fields: updated.data.fields } satisfies AirtableRecord<AirtableCaseFields>;
  return { ok: true, data: mapAirtableCase(record) };
}

export async function updateAirtablePortalStatus(caseId: string, portalStatus: string): Promise<ActionResult<CaseRecord>> {
  const entity = await getAirtableCaseEntityByCaseId(caseId);
  if (!entity.ok || !entity.data) return { ok: false, error: entity.error || 'Case not found' };

  const updated = await updateAirtableRecord(env.airtableCasesTable, entity.data.recordId, { 'Client portal status': portalStatus });
  if (!updated.ok || !updated.data) return { ok: false, error: updated.error || 'Failed to update portal status' };

  const record = { id: updated.data.id, fields: updated.data.fields } satisfies AirtableRecord<AirtableCaseFields>;
  return { ok: true, data: mapAirtableCase(record) };
}

export async function createAirtableActivityLog(caseId: string, eventType: string, summary: string, actor = 'KeyPoint app') {
  const entity = await getAirtableCaseEntityByCaseId(caseId);
  if (!entity.ok || !entity.data) {
    return { ok: false, error: entity.error || 'Case not found for activity log' } as const;
  }

  return createAirtableRecord(env.airtableActivityLogTable, {
    'Case link': [entity.data.recordId],
    Actor: actor,
    'Event type': eventType,
    Summary: summary,
    'Source system': 'keypoint-app',
    Timestamp: new Date().toISOString(),
  });
}

export async function createAirtableCaseDocument(caseId: string, documentCode: string, fileUrl: string, status = 'uploaded') {
  const entity = await getAirtableCaseEntityByCaseId(caseId);
  if (!entity.ok || !entity.data) {
    return { ok: false, error: entity.error || 'Case not found for document record' } as const;
  }

  return createAirtableRecord(env.airtableDocumentsTable, {
    'Case link': [entity.data.recordId],
    'Document code': documentCode,
    Status: status,
    'Uploaded file URL': fileUrl,
  });
}
