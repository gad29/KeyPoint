import { env, hasAirtableConfig } from '@/lib/env';
import type { BankOffer, CaseRecord, CaseStage, CaseType, BorrowerProfile } from '@/data/domain';
import type { ActionResult, CaseUpdateInput, CreateBankOfferInput, CreateCaseInput } from '@/lib/types';
import { getRequiredDocumentCodes, type IntakePayload } from '@/lib/intake';

const apiBase = 'https://api.airtable.com/v0';
const metaApiBase = 'https://api.airtable.com/v0/meta/bases';

type AirtableRecord<T = Record<string, unknown>> = {
  id: string;
  fields: T;
  createdTime?: string;
};

type AirtableListResponse<T = Record<string, unknown>> = {
  records: Array<AirtableRecord<T>>;
  offset?: string;
};

type AirtableMetaResponse = {
  tables: Array<{
    id: string;
    name: string;
    fields: Array<{ id: string; name: string; type: string }>;
  }>;
};

type AirtableCaseFields = Record<string, unknown>;
type AirtableBankRunFields = Record<string, unknown>;

type AirtableCaseEntity = {
  recordId: string;
  case: CaseRecord;
};

type TableSchema = {
  name: string;
  fields: string[];
  fieldLookup: Map<string, string>;
};

type SemanticFieldMap = Record<string, string[]>;

type WriteFieldsResult = {
  fields: Record<string, unknown>;
  missing: string[];
};

const schemaCache = new Map<string, Promise<TableSchema | null>>();

const caseFieldAliases = {
  caseId: ['Case ID', 'Case Id', 'case_id', 'caseid'],
  leadName: ['Lead name', 'Lead Name', 'Client name', 'Client Name', 'Name'],
  spouseName: ['Spouse name', 'Spouse Name'],
  phone: ['Phone', 'Phone number', 'WhatsApp number', 'Mobile'],
  email: ['Email', 'E-mail'],
  caseType: ['Case type', 'Case Type'],
  borrowerProfiles: ['Borrower profiles', 'Borrower Profiles', 'Borrower profile'],
  currentStage: ['Current stage', 'Current Stage', 'Stage'],
  assignedStaff: ['Assigned staff', 'Assigned Staff', 'Owner', 'Assignee'],
  missingItemsCount: ['Missing items count', 'Missing Items Count', 'Missing documents count'],
  clientPortalStatus: ['Client portal status', 'Portal status', 'Client Portal Status'],
  filloutSubmissionId: ['Fillout submission id', 'Submission ID', 'Submission Id'],
  nextAction: ['Next action', 'Next Action'],
  notes: ['Notes', 'Internal notes', 'Internal Notes'],
  bankTargets: ['Bank targets', 'Target banks', 'Preferred banks'],
} satisfies SemanticFieldMap;

const bankRunFieldAliases = {
  caseLink: ['Case link', 'Case Link', 'Case ID', 'Case Id'],
  bankName: ['Bank name', 'Bank Name', 'Bank'],
  requestedAt: ['Requested at', 'Requested At'],
  status: ['Status'],
  firstPayment: ['First payment', 'First Payment'],
  maxPayment: ['Max payment', 'Max Payment'],
  totalRepayment: ['Total repayment', 'Total Repayment'],
  totalInterest: ['Total interest', 'Total Interest'],
  expiryDate: ['Expiry date', 'Expiration date', 'Expires at'],
  conditions: ['Conditions / comments', 'Conditions', 'Comments'],
} satisfies SemanticFieldMap;

const activityLogFieldAliases = {
  caseLink: ['Case link', 'Case Link', 'Case ID'],
  actor: ['Actor'],
  eventType: ['Event type', 'Event Type'],
  summary: ['Summary'],
  sourceSystem: ['Source system', 'Source System'],
  timestamp: ['Timestamp', 'Created at'],
} satisfies SemanticFieldMap;

const documentFieldAliases = {
  caseLink: ['Case link', 'Case Link', 'Case ID'],
  documentCode: ['Document code', 'Document Code'],
  required: ['Required?', 'Required'],
  status: ['Status'],
  uploadedFileUrl: ['Uploaded file URL', 'Uploaded File URL', 'File URL'],
  ocrSummary: ['OCR summary', 'OCR Summary'],
  reviewNotes: ['Review notes', 'Review Notes'],
  requestedResubmissionAt: ['Requested resubmission at'],
  approvedAt: ['Approved at'],
} satisfies SemanticFieldMap;

const clientFieldAliases = {
  caseLink: ['Case link', 'Case Link', 'Case ID'],
  fullName: ['Full name', 'Full Name', 'Name'],
  idNumber: ['ID number', 'ID Number'],
  preferredLanguage: ['Preferred language', 'Preferred Language'],
  whatsappNumber: ['WhatsApp number', 'Phone', 'WhatsApp'],
  email: ['Email'],
} satisfies SemanticFieldMap;

const aiReviewFieldAliases = {
  caseLink: ['Case link', 'Case Link', 'Case ID'],
  triggeredBy: ['Triggered by', 'Triggered By'],
  anonymizedPayloadRef: ['Anonymized payload ref', 'Payload ref'],
  reviewStatus: ['Review status', 'Review Status', 'Status'],
} satisfies SemanticFieldMap;

function logAirtable(level: 'info' | 'warn' | 'error', message: string, details?: Record<string, unknown>) {
  const payload = details ? ` ${JSON.stringify(details)}` : '';
  const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  logger(`[KeyPoint Airtable] ${message}${payload}`);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((item) => asString(item)).filter(Boolean).join(', ');
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
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === 'string') return [item];
        if (typeof item === 'number') return [String(item)];
        return [];
      })
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
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

function normalizeBankOfferStatus(value: unknown): BankOffer['status'] {
  const raw = asString(value, 'requested').trim().toLowerCase().replace(/\s+/g, '-') as BankOffer['status'];
  const allowed: BankOffer['status'][] = ['not-started', 'requested', 'received', 'expired'];
  return allowed.includes(raw) ? raw : 'requested';
}

function normalizeFieldKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function createFallbackSchema(name: string, aliases: SemanticFieldMap): TableSchema {
  const fields = Object.values(aliases).map((item) => item[0]);
  return {
    name,
    fields,
    fieldLookup: new Map(fields.map((field) => [normalizeFieldKey(field), field])),
  };
}

async function fetchTableSchema(table: string): Promise<TableSchema | null> {
  if (!hasAirtableConfig()) return null;

  try {
    const response = await fetch(`${metaApiBase}/${env.airtableBaseId}/tables`, {
      headers: {
        Authorization: `Bearer ${env.airtableApiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      logAirtable('warn', 'Failed to fetch Airtable schema metadata', { table, status: response.status });
      return null;
    }

    const payload = (await response.json()) as AirtableMetaResponse;
    const matchedTable = payload.tables.find((item) => item.name === table);

    if (!matchedTable) {
      logAirtable('warn', 'Airtable schema metadata missing table', { table });
      return null;
    }

    return {
      name: matchedTable.name,
      fields: matchedTable.fields.map((field) => field.name),
      fieldLookup: new Map(matchedTable.fields.map((field) => [normalizeFieldKey(field.name), field.name])),
    };
  } catch (error) {
    logAirtable('warn', 'Airtable schema fetch failed', {
      table,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function getTableSchema(table: string, aliases: SemanticFieldMap): Promise<TableSchema> {
  if (!schemaCache.has(table)) {
    schemaCache.set(table, fetchTableSchema(table));
  }

  const schema = await schemaCache.get(table);
  return schema ?? createFallbackSchema(table, aliases);
}

function resolveFieldName(schema: TableSchema, aliases: string[]) {
  for (const alias of aliases) {
    const matched = schema.fieldLookup.get(normalizeFieldKey(alias));
    if (matched) return matched;
  }
  return undefined;
}

function pickFieldValue(fields: Record<string, unknown>, schema: TableSchema, aliases: string[]) {
  for (const alias of aliases) {
    const matched = schema.fieldLookup.get(normalizeFieldKey(alias)) ?? alias;
    if (matched in fields) return fields[matched];
  }

  const fallbackEntry = Object.entries(fields).find(([key]) => aliases.some((alias) => normalizeFieldKey(alias) === normalizeFieldKey(key)));
  return fallbackEntry?.[1];
}

function buildWriteFields(
  schema: TableSchema,
  aliases: SemanticFieldMap,
  values: Record<string, unknown>,
  options?: { required?: string[]; table?: string },
): WriteFieldsResult {
  const fields: Record<string, unknown> = {};
  const missing: string[] = [];
  const resolvedSemanticKeys = new Set<string>();

  for (const [semanticKey, value] of Object.entries(values)) {
    if (value === undefined) continue;

    const aliasList = aliases[semanticKey];
    if (!aliasList?.length) continue;

    const fieldName = resolveFieldName(schema, aliasList);
    if (!fieldName) {
      missing.push(semanticKey);
      continue;
    }

    fields[fieldName] = value;
    resolvedSemanticKeys.add(semanticKey);
  }

  if (missing.length && options?.table) {
    logAirtable('warn', 'Skipping Airtable fields that are not present in schema', {
      table: options.table,
      missing,
      availableFields: schema.fields,
    });
  }

  const requiredMissing = options?.required?.filter((key) => !resolvedSemanticKeys.has(key)) ?? [];
  if (requiredMissing.length && options?.table) {
    logAirtable('error', 'Airtable table is missing required fields for operation', {
      table: options.table,
      requiredMissing,
      availableFields: schema.fields,
    });
  }

  return { fields, missing: requiredMissing.length ? requiredMissing : missing };
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

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.airtableApiKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    });
  } catch (error) {
    logAirtable('error', 'Airtable network request failed', {
      url: url.toString(),
      method: init?.method || 'GET',
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: 'Airtable request failed before the server responded' };
  }

  const responseText = await res.text();
  const responseJson = responseText ? safeJsonParse(responseText) : undefined;

  if (!res.ok) {
    logAirtable('error', 'Airtable request returned an error response', {
      url: url.toString(),
      method: init?.method || 'GET',
      status: res.status,
      response: responseJson ?? responseText,
    });

    const airtableMessage =
      responseJson && typeof responseJson === 'object' && responseJson && 'error' in responseJson
        ? asString((responseJson as Record<string, unknown>).error)
        : '';

    return { ok: false, error: airtableMessage || `Airtable request failed with ${res.status}` };
  }

  return { ok: true, data: (responseJson as T | undefined) ?? ({} as T) };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
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

async function findAirtableRecordByAliases<T = Record<string, unknown>>(
  table: string,
  schema: TableSchema,
  aliases: string[],
  value: string,
) {
  const fieldName = resolveFieldName(schema, aliases);
  if (!fieldName) {
    return { ok: false, error: `No matching field found in ${table}` } as const;
  }

  return findAirtableRecordByField<T>(table, fieldName, value);
}

async function mapAirtableCase(record: AirtableRecord<AirtableCaseFields>): Promise<CaseRecord> {
  const schema = await getTableSchema(env.airtableCasesTable, caseFieldAliases);
  const fields = record.fields;
  const caseId = asString(pickFieldValue(fields, schema, caseFieldAliases.caseId), record.id);

  return {
    id: caseId,
    leadName: asString(pickFieldValue(fields, schema, caseFieldAliases.leadName), 'Unknown lead'),
    spouseName: isString(pickFieldValue(fields, schema, caseFieldAliases.spouseName))
      ? asString(pickFieldValue(fields, schema, caseFieldAliases.spouseName))
      : undefined,
    phone: asString(pickFieldValue(fields, schema, caseFieldAliases.phone)),
    email: isString(pickFieldValue(fields, schema, caseFieldAliases.email))
      ? asString(pickFieldValue(fields, schema, caseFieldAliases.email))
      : undefined,
    stage: normalizeStage(pickFieldValue(fields, schema, caseFieldAliases.currentStage)),
    caseType: normalizeCaseType(pickFieldValue(fields, schema, caseFieldAliases.caseType)),
    borrowerProfiles: normalizeBorrowerProfiles(pickFieldValue(fields, schema, caseFieldAliases.borrowerProfiles)),
    missingItems: asNumber(pickFieldValue(fields, schema, caseFieldAliases.missingItemsCount)),
    assignedTo: asString(pickFieldValue(fields, schema, caseFieldAliases.assignedStaff), 'Unassigned'),
    bankTargets: asStringArray(pickFieldValue(fields, schema, caseFieldAliases.bankTargets)),
    nextAction: asString(pickFieldValue(fields, schema, caseFieldAliases.nextAction), 'Review case in office dashboard.'),
    portalStatus: isString(pickFieldValue(fields, schema, caseFieldAliases.clientPortalStatus))
      ? asString(pickFieldValue(fields, schema, caseFieldAliases.clientPortalStatus))
      : undefined,
    airtableRecordId: record.id,
  };
}

async function mapAirtableBankRun(record: AirtableRecord<AirtableBankRunFields>): Promise<BankOffer> {
  const schema = await getTableSchema(env.airtableBankRunsTable, bankRunFieldAliases);
  const fields = record.fields;
  return {
    bank: asString(pickFieldValue(fields, schema, bankRunFieldAliases.bankName), 'Bank'),
    status: normalizeBankOfferStatus(pickFieldValue(fields, schema, bankRunFieldAliases.status)),
    firstPayment: asString(pickFieldValue(fields, schema, bankRunFieldAliases.firstPayment)) || undefined,
    maxPayment: asString(pickFieldValue(fields, schema, bankRunFieldAliases.maxPayment)) || undefined,
    totalRepayment: asString(pickFieldValue(fields, schema, bankRunFieldAliases.totalRepayment)) || undefined,
    expiresAt: asString(pickFieldValue(fields, schema, bankRunFieldAliases.expiryDate)) || undefined,
  };
}

function makeCaseId() {
  const serial = Math.floor(1000 + Math.random() * 9000);
  return `CASE-${serial}`;
}

async function mapCreateCaseFields(input: CreateCaseInput) {
  const schema = await getTableSchema(env.airtableCasesTable, caseFieldAliases);
  const source = input.source ? `\n\nSource: ${input.source}` : '';
  const missingItemsCount = input.missingItemsCount ?? 0;
  const portalStatus = input.portalStatus ?? 'not-invited';

  return buildWriteFields(
    schema,
    caseFieldAliases,
    {
      caseId: makeCaseId(),
      leadName: input.leadName,
      spouseName: input.spouseName || '',
      phone: input.phone,
      email: input.email || '',
      caseType: input.caseType,
      borrowerProfiles: input.borrowerProfiles.join(', '),
      currentStage: input.stage || 'new-lead',
      assignedStaff: input.assignedTo || 'Unassigned',
      missingItemsCount,
      clientPortalStatus: portalStatus,
      filloutSubmissionId: input.submissionId || '',
      nextAction: input.nextAction || 'Review intake and move the case forward.',
      notes: `${input.notes || ''}${source}`.trim(),
    },
    { required: ['caseId', 'leadName', 'phone'], table: env.airtableCasesTable },
  );
}

export async function listAirtableCases(): Promise<ActionResult<CaseRecord[]>> {
  const schema = await getTableSchema(env.airtableCasesTable, caseFieldAliases);
  const sortField = resolveFieldName(schema, caseFieldAliases.leadName) || 'Lead name';
  const result = await listAirtableRecords<AirtableCaseFields>(env.airtableCasesTable, {
    'sort[0][field]': sortField,
    'sort[0][direction]': 'asc',
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error || 'Failed to list Airtable cases' };
  }

  return { ok: true, data: await Promise.all(result.data.map(mapAirtableCase)) };
}

export async function getAirtableCaseEntityByCaseId(caseId: string): Promise<ActionResult<AirtableCaseEntity>> {
  const schema = await getTableSchema(env.airtableCasesTable, caseFieldAliases);
  const result = await findAirtableRecordByAliases<AirtableCaseFields>(env.airtableCasesTable, schema, caseFieldAliases.caseId, caseId);
  if (!result.ok || !result.data) {
    return { ok: false, error: result.error || 'Case not found in Airtable' };
  }

  return {
    ok: true,
    data: {
      recordId: result.data.id,
      case: await mapAirtableCase(result.data),
    },
  };
}

export async function getAirtableCaseByCaseId(caseId: string): Promise<ActionResult<CaseRecord>> {
  const result = await getAirtableCaseEntityByCaseId(caseId);
  if (!result.ok || !result.data) return { ok: false, error: result.error || 'Case not found in Airtable' };
  return { ok: true, data: result.data.case };
}

export async function createAirtableCase(input: CreateCaseInput): Promise<ActionResult<CaseRecord>> {
  const mapped = await mapCreateCaseFields(input);
  if (mapped.missing.length) {
    return { ok: false, error: `Cases table is missing required fields: ${mapped.missing.join(', ')}` };
  }

  const created = await createAirtableRecord(env.airtableCasesTable, mapped.fields);
  if (!created.ok || !created.data) {
    return { ok: false, error: created.error || 'Failed to create Airtable case' };
  }

  const record = { id: created.data.id, fields: created.data.fields } satisfies AirtableRecord<AirtableCaseFields>;
  return { ok: true, data: await mapAirtableCase(record) };
}

export async function updateAirtableCase(caseId: string, input: CaseUpdateInput): Promise<ActionResult<CaseRecord>> {
  const entity = await getAirtableCaseEntityByCaseId(caseId);
  if (!entity.ok || !entity.data) return { ok: false, error: entity.error || 'Case not found' };

  const schema = await getTableSchema(env.airtableCasesTable, caseFieldAliases);
  const notesAppend = input.notesAppend?.trim();
  const currentNotesFieldName = resolveFieldName(schema, caseFieldAliases.notes);
  let currentNotes = '';

  if (notesAppend && currentNotesFieldName) {
    const currentNotesRecord = await findAirtableRecordByAliases<AirtableCaseFields>(
      env.airtableCasesTable,
      schema,
      caseFieldAliases.caseId,
      caseId,
    );
    currentNotes = currentNotesRecord.ok && currentNotesRecord.data ? asString(currentNotesRecord.data.fields[currentNotesFieldName]) : '';
  }

  const mapped = buildWriteFields(
    schema,
    caseFieldAliases,
    {
      currentStage: input.stage,
      assignedStaff: typeof input.assignedTo === 'string' ? input.assignedTo : undefined,
      clientPortalStatus: typeof input.portalStatus === 'string' ? input.portalStatus : undefined,
      nextAction: typeof input.nextAction === 'string' ? input.nextAction : undefined,
      missingItemsCount: typeof input.missingItemsCount === 'number' ? input.missingItemsCount : undefined,
      notes: notesAppend ? [currentNotes.trim(), notesAppend].filter(Boolean).join('\n\n') : undefined,
    },
    { table: env.airtableCasesTable },
  );

  if (!Object.keys(mapped.fields).length) {
    return { ok: true, data: entity.data.case };
  }

  const updated = await updateAirtableRecord(env.airtableCasesTable, entity.data.recordId, mapped.fields);
  if (!updated.ok || !updated.data) return { ok: false, error: updated.error || 'Failed to update case' };

  const record = { id: updated.data.id, fields: updated.data.fields } satisfies AirtableRecord<AirtableCaseFields>;
  return { ok: true, data: await mapAirtableCase(record) };
}

export async function updateAirtableCaseStage(caseId: string, stage: CaseStage): Promise<ActionResult<CaseRecord>> {
  return updateAirtableCase(caseId, { stage });
}

export async function updateAirtablePortalStatus(caseId: string, portalStatus: string): Promise<ActionResult<CaseRecord>> {
  return updateAirtableCase(caseId, { portalStatus });
}

export async function createAirtableActivityLog(caseId: string, eventType: string, summary: string, actor = 'KeyPoint app') {
  const entity = await getAirtableCaseEntityByCaseId(caseId);
  if (!entity.ok || !entity.data) {
    return { ok: false, error: entity.error || 'Case not found for activity log' } as const;
  }

  const schema = await getTableSchema(env.airtableActivityLogTable, activityLogFieldAliases);
  const mapped = buildWriteFields(
    schema,
    activityLogFieldAliases,
    {
      caseLink: caseId,
      actor,
      eventType,
      summary,
      sourceSystem: 'keypoint-app',
      timestamp: new Date().toISOString(),
    },
    { required: ['caseLink', 'eventType', 'summary'], table: env.airtableActivityLogTable },
  );

  if (mapped.missing.length) {
    return { ok: false, error: `Activity log table is missing required fields: ${mapped.missing.join(', ')}` } as const;
  }

  return createAirtableRecord(env.airtableActivityLogTable, mapped.fields);
}

export async function createAirtableCaseDocument(caseId: string, documentCode: string, fileUrl: string, status = 'uploaded') {
  const entity = await getAirtableCaseEntityByCaseId(caseId);
  if (!entity.ok || !entity.data) {
    return { ok: false, error: entity.error || 'Case not found for document record' } as const;
  }

  const schema = await getTableSchema(env.airtableDocumentsTable, documentFieldAliases);
  const mapped = buildWriteFields(
    schema,
    documentFieldAliases,
    {
      caseLink: caseId,
      documentCode,
      status,
      uploadedFileUrl: fileUrl,
    },
    { required: ['caseLink', 'documentCode', 'status'], table: env.airtableDocumentsTable },
  );

  if (mapped.missing.length) {
    return { ok: false, error: `Case documents table is missing required fields: ${mapped.missing.join(', ')}` } as const;
  }

  return createAirtableRecord(env.airtableDocumentsTable, mapped.fields);
}

export interface CaseDocumentRecord {
  recordId: string;
  caseId: string;
  documentCode: string;
  status: string;
  uploadedFileUrl?: string;
  reviewNotes?: string;
  approvedAt?: string;
}

export async function listAirtableCaseDocuments(caseId: string): Promise<ActionResult<CaseDocumentRecord[]>> {
  const schema = await getTableSchema(env.airtableDocumentsTable, documentFieldAliases);
  const caseLinkField = resolveFieldName(schema, documentFieldAliases.caseLink);
  if (!caseLinkField) {
    return { ok: false, error: 'Case documents table does not include a case link field' };
  }

  const result = await listAirtableRecords<Record<string, unknown>>(env.airtableDocumentsTable, {
    filterByFormula: `{${caseLinkField}}='${caseId.replace(/'/g, "\\'")}'`,
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error || 'Failed to list case documents' };
  }

  const docs: CaseDocumentRecord[] = result.data.map((rec) => {
    const f = rec.fields;
    const resolveF = (aliases: string[]) => {
      for (const alias of aliases) {
        if (f[alias] !== undefined) return f[alias];
      }
      return undefined;
    };
    return {
      recordId: rec.id,
      caseId: asString(resolveF(documentFieldAliases.caseLink)),
      documentCode: asString(resolveF(documentFieldAliases.documentCode)),
      status: asString(resolveF(documentFieldAliases.status), 'not-uploaded'),
      uploadedFileUrl: asString(resolveF(documentFieldAliases.uploadedFileUrl)) || undefined,
      reviewNotes: asString(resolveF(documentFieldAliases.reviewNotes)) || undefined,
      approvedAt: asString(resolveF(documentFieldAliases.approvedAt)) || undefined,
    };
  });

  return { ok: true, data: docs };
}

export async function updateAirtableCaseDocumentStatus(
  caseId: string,
  documentCode: string,
  status: string,
  reviewNote?: string,
): Promise<ActionResult<CaseDocumentRecord>> {
  const listResult = await listAirtableCaseDocuments(caseId);
  if (!listResult.ok || !listResult.data) {
    return { ok: false, error: listResult.error || 'Could not list documents for case' };
  }

  const existing = listResult.data.find((d) => d.documentCode === documentCode);
  if (!existing) {
    return { ok: false, error: `Document ${documentCode} not found for case ${caseId}` };
  }

  const schema = await getTableSchema(env.airtableDocumentsTable, documentFieldAliases);
  const updateFields: Record<string, unknown> = {};

  const statusField = resolveFieldName(schema, documentFieldAliases.status);
  if (statusField) updateFields[statusField] = status;

  if (reviewNote) {
    const notesField = resolveFieldName(schema, documentFieldAliases.reviewNotes);
    if (notesField) updateFields[notesField] = reviewNote;
  }

  if (status === 'approved') {
    const approvedField = resolveFieldName(schema, documentFieldAliases.approvedAt);
    if (approvedField) updateFields[approvedField] = new Date().toISOString();
  }

  if (status === 'resubmit-needed') {
    const resubField = resolveFieldName(schema, documentFieldAliases.requestedResubmissionAt);
    if (resubField) updateFields[resubField] = new Date().toISOString();
  }

  const updated = await updateAirtableRecord(env.airtableDocumentsTable, existing.recordId, updateFields);
  if (!updated.ok) return { ok: false, error: updated.error || 'Failed to update document status' };

  return { ok: true, data: { ...existing, status, reviewNotes: reviewNote ?? existing.reviewNotes } };
}

export async function listAirtableBankRuns(caseId: string): Promise<ActionResult<BankOffer[]>> {
  const schema = await getTableSchema(env.airtableBankRunsTable, bankRunFieldAliases);
  const caseLinkField = resolveFieldName(schema, bankRunFieldAliases.caseLink);
  const bankNameField = resolveFieldName(schema, bankRunFieldAliases.bankName) || 'Bank name';

  if (!caseLinkField) {
    return { ok: false, error: 'Bank runs table does not include a case link field' };
  }

  const result = await listAirtableRecords<AirtableBankRunFields>(env.airtableBankRunsTable, {
    filterByFormula: `{${caseLinkField}}='${caseId.replace(/'/g, "\\'")}'`,
    'sort[0][field]': bankNameField,
    'sort[0][direction]': 'asc',
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error || 'Failed to list bank runs' };
  }

  return { ok: true, data: await Promise.all(result.data.map(mapAirtableBankRun)) };
}

export async function createAirtableBankRun(input: CreateBankOfferInput) {
  const entity = await getAirtableCaseEntityByCaseId(input.caseId);
  if (!entity.ok || !entity.data) {
    return { ok: false, error: entity.error || 'Case not found for bank run' } as const;
  }

  const schema = await getTableSchema(env.airtableBankRunsTable, bankRunFieldAliases);
  const mapped = buildWriteFields(
    schema,
    bankRunFieldAliases,
    {
      caseLink: input.caseId,
      bankName: input.bank,
      requestedAt: new Date().toISOString(),
      status: input.status,
      firstPayment: input.firstPayment || '',
      maxPayment: input.maxPayment || '',
      totalRepayment: input.totalRepayment || '',
      expiryDate: input.expiresAt || '',
      conditions: '',
    },
    { required: ['caseLink', 'bankName', 'status'], table: env.airtableBankRunsTable },
  );

  if (mapped.missing.length) {
    return { ok: false, error: `Bank runs table is missing required fields: ${mapped.missing.join(', ')}` } as const;
  }

  return createAirtableRecord(env.airtableBankRunsTable, mapped.fields);
}

export async function createAirtableAiReviewStub(caseId: string, triggeredBy: string, payloadRef: string) {
  try {
    const schema = await getTableSchema(env.airtableAiReviewsTable, aiReviewFieldAliases);
    const mapped = buildWriteFields(
      schema,
      aiReviewFieldAliases,
      {
        caseLink: caseId,
        triggeredBy,
        anonymizedPayloadRef: payloadRef,
        reviewStatus: 'pending',
      },
      { required: ['caseLink', 'triggeredBy'], table: env.airtableAiReviewsTable },
    );

    if (mapped.missing.length) {
      return { ok: false, error: `AI reviews table is missing required fields: ${mapped.missing.join(', ')}` } as const;
    }

    return await createAirtableRecord(env.airtableAiReviewsTable, mapped.fields);
  } catch {
    return { ok: false, error: 'AI review table is not available' } as const;
  }
}

async function createAirtableClientForCaseRecord(caseId: string, fields: Record<string, unknown>) {
  const schema = await getTableSchema(env.airtableClientsTable, clientFieldAliases);
  const mapped = buildWriteFields(
    schema,
    clientFieldAliases,
    {
      ...fields,
      caseLink: caseId,
    },
    { required: ['caseLink', 'fullName'], table: env.airtableClientsTable },
  );

  if (mapped.missing.length) {
    return { ok: false, error: `Clients table is missing required fields: ${mapped.missing.join(', ')}` } as const;
  }

  return createAirtableRecord(env.airtableClientsTable, mapped.fields);
}

async function seedAirtableCaseDocumentsForRecord(caseId: string, caseType: CaseType, borrowerProfiles: BorrowerProfile[]) {
  const schema = await getTableSchema(env.airtableDocumentsTable, documentFieldAliases);
  const documentCodes = getRequiredDocumentCodes(caseType, borrowerProfiles);

  const results = await Promise.all(
    documentCodes.map(async (documentCode) => {
      const mapped = buildWriteFields(
        schema,
        documentFieldAliases,
        {
          caseLink: caseId,
          documentCode,
          required: true,
          status: 'not-uploaded',
        },
        { required: ['caseLink', 'documentCode', 'status'], table: env.airtableDocumentsTable },
      );

      if (mapped.missing.length) {
        return { ok: false, error: `Case documents table is missing required fields: ${mapped.missing.join(', ')}` } as const;
      }

      return createAirtableRecord(env.airtableDocumentsTable, mapped.fields);
    }),
  );

  const failed = results.find((result) => !result.ok);
  if (failed) {
    return { ok: false, error: failed.error || 'Failed to seed case documents' } as const;
  }

  return { ok: true, data: documentCodes } as const;
}

export async function createNativeIntakeCase(input: CreateCaseInput & { intake: IntakePayload }) {
  const normalizedCaseType = normalizeCaseType(input.caseType);
  const normalizedBorrowerProfiles = normalizeBorrowerProfiles(input.borrowerProfiles);
  const requiredDocumentCodes = getRequiredDocumentCodes(normalizedCaseType, normalizedBorrowerProfiles);
  const created = await createAirtableCase({
    ...input,
    missingItemsCount: requiredDocumentCodes.length,
    portalStatus: 'pending-office-approval',
    caseType: normalizedCaseType,
    borrowerProfiles: normalizedBorrowerProfiles,
    nextAction: 'Review intake, approve the case, and send the client progress link.',
  });

  if (!created.ok || !created.data) {
    return { ok: false, error: created.error || 'Failed to create Airtable case' } as const;
  }

  const caseRecord = created.data;
  const caseId = caseRecord.id;
  const warnings: string[] = [];

  const primaryClient = await createAirtableClientForCaseRecord(caseId, {
    fullName: input.intake.applicant.fullName.trim(),
    idNumber: input.intake.applicant.idNumber?.trim() || '',
    preferredLanguage: input.intake.contact.preferredLanguage,
    whatsappNumber: input.intake.contact.phone.trim(),
    email: input.intake.contact.email?.trim() || '',
  });
  const primaryClientCreated = primaryClient.ok;

  if (!primaryClient.ok) {
    warnings.push(primaryClient.error || 'Primary client creation failed');
    logAirtable('warn', 'Primary client creation failed after case creation', { caseId, error: primaryClient.error });
  }

  let secondaryClientCreated = false;
  if (input.intake.coApplicant.hasCoApplicant && input.intake.coApplicant.fullName?.trim()) {
    const secondaryClient = await createAirtableClientForCaseRecord(caseId, {
      fullName: input.intake.coApplicant.fullName.trim(),
      idNumber: input.intake.coApplicant.idNumber?.trim() || '',
      preferredLanguage: input.intake.contact.preferredLanguage,
      whatsappNumber: input.intake.contact.phone.trim(),
      email: input.intake.contact.email?.trim() || '',
    });
    secondaryClientCreated = secondaryClient.ok;

    if (!secondaryClient.ok) {
      warnings.push(secondaryClient.error || 'Co-applicant creation failed');
      logAirtable('warn', 'Co-applicant creation failed after case creation', { caseId, error: secondaryClient.error });
    }
  }

  const seededDocuments = await seedAirtableCaseDocumentsForRecord(caseId, normalizedCaseType, normalizedBorrowerProfiles);
  if (!seededDocuments.ok) {
    warnings.push(seededDocuments.error || 'Document checklist seeding failed');
    logAirtable('warn', 'Document checklist seeding failed after case creation', { caseId, error: seededDocuments.error });
  }

  const activity = await createAirtableActivityLog(caseId, 'intake_received', 'Native intake captured and case seeded', 'system');
  if (!activity.ok) {
    warnings.push(activity.error || 'Activity log creation failed');
    logAirtable('warn', 'Activity log creation failed after case creation', { caseId, error: activity.error });
  }

  return {
    ok: true,
    data: caseRecord,
    meta: {
      requiredDocumentCodes,
      clientsCreated: Number(primaryClientCreated) + Number(secondaryClientCreated),
      warnings,
    },
  } as const;
}
