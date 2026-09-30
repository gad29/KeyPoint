export const env = {
  /** Postgres connection string (Supabase or any Postgres). When set, Postgres is the system of record. */
  databaseUrl: process.env.DATABASE_URL,
  /** Force a backend: 'postgres' | 'airtable' | 'demo'. Empty = auto-detect. */
  dataBackend: (process.env.DATA_BACKEND || '').trim().toLowerCase(),
  /** Which agency (tenant) this deployment serves. */
  agencySlug: (process.env.AGENCY_SLUG || 'default').trim().toLowerCase(),
  airtableApiKey: process.env.AIRTABLE_API_KEY,
  airtableBaseId: process.env.AIRTABLE_BASE_ID,
  airtableCasesTable: process.env.AIRTABLE_CASES_TABLE || 'Cases',
  airtableClientsTable: process.env.AIRTABLE_CLIENTS_TABLE || 'Clients',
  airtableDocumentsTable: process.env.AIRTABLE_DOCUMENTS_TABLE || 'Case documents',
  airtableActivityLogTable: process.env.AIRTABLE_ACTIVITY_LOG_TABLE || 'Activity log',
  airtableBankRunsTable: process.env.AIRTABLE_BANK_RUNS_TABLE || 'Bank runs',
  airtableAiReviewsTable: process.env.AIRTABLE_AI_REVIEWS_TABLE || 'AI reviews',
  airtableStaffTable: process.env.AIRTABLE_STAFF_TABLE || 'Staff',
  airtableFinanceTransactionsTable: process.env.AIRTABLE_FINANCE_TRANSACTIONS_TABLE || 'Finance transactions',
  airtableBillingEventsTable: process.env.AIRTABLE_BILLING_EVENTS_TABLE || 'Billing events',
  staffSessionSecret: process.env.STAFF_SESSION_SECRET,
  staffRegisterSecret: process.env.STAFF_REGISTER_SECRET,
  n8nWebhookBaseUrl: process.env.N8N_WEBHOOK_BASE_URL,
  /** Shared secret for POST /api/webhooks/n8n when not using an office session (optional in local dev). */
  n8nForwarderSecret: process.env.N8N_FORWARDER_SECRET,
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  keypointAppBaseUrl: process.env.KEYPOINT_APP_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:3000',
  portalInviteSecret: process.env.PORTAL_INVITE_SECRET || 'change-me',
  officeAccessCode: process.env.OFFICE_ACCESS_CODE,
  officeSessionSecret: process.env.OFFICE_SESSION_SECRET,
  officeSessionHours: process.env.OFFICE_SESSION_HOURS || '12',
  uploadDir: process.env.UPLOAD_DIR || './data/uploads',
  uploadPublicBaseUrl: process.env.UPLOAD_PUBLIC_BASE_URL,
  uploadMaxFileBytes: (() => {
    const raw = process.env.UPLOAD_MAX_FILE_BYTES;
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
    return 15 * 1024 * 1024;
  })(),
  officeAlertWebhookUrl: process.env.OFFICE_ALERT_WEBHOOK_URL,
  whatsappProviderWebhookUrl: process.env.WHATSAPP_PROVIDER_WEBHOOK_URL,
  smsProviderWebhookUrl: process.env.SMS_PROVIDER_WEBHOOK_URL,
  emailProviderWebhookUrl: process.env.EMAIL_PROVIDER_WEBHOOK_URL,
  documentOcrWebhookUrl: process.env.DOCUMENT_OCR_WEBHOOK_URL,
  aiReviewWebhookUrl: process.env.AI_REVIEW_WEBHOOK_URL,
  secretaryWhatsapp: process.env.SECRETARY_WHATSAPP,
  googleClientEmail: process.env.GOOGLE_CLIENT_EMAIL,
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY,
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
  googleSheetsSpreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
  twilioSmsFrom: process.env.TWILIO_SMS_FROM,
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS,
  emailReplyTo: process.env.EMAIL_REPLY_TO,
  emailApiKey: process.env.EMAIL_API_KEY,
  /** Which preset shapes vocabulary and features. See lib/presets. */
  preset: (process.env.AGENCY_OS_PRESET || 'default').trim().toLowerCase(),
  /** Optional business branding used across UI + emails. */
  businessName: process.env.BUSINESS_NAME || '',
  businessNameHe: process.env.BUSINESS_NAME_HE || '',
  businessTagline: process.env.BUSINESS_TAGLINE || '',
  businessTaglineHe: process.env.BUSINESS_TAGLINE_HE || '',
  businessLogoUrl: process.env.BUSINESS_LOGO_URL || '',
  /** Hex brand color, e.g. #1f6f5c. Overridable in the admin onboarding page. */
  brandColor: (process.env.BRAND_COLOR || '').trim(),
  /** Optional Supabase Storage for uploads (otherwise files go to UPLOAD_DIR on local disk). */
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'client-files',
  /** Currency for invoices/chase. Defaults to ILS for the Israeli market; overridable per tenant. */
  currency: (process.env.BUSINESS_CURRENCY || 'ILS').trim().toUpperCase(),
  /** Payment integrations (all optional). */
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  icountCompanyId: process.env.ICOUNT_COMPANY_ID,
  icountUser: process.env.ICOUNT_USER,
  icountPassword: process.env.ICOUNT_PASSWORD,
  greenInvoiceApiKey: process.env.GREEN_INVOICE_API_KEY,
  greenInvoiceApiSecret: process.env.GREEN_INVOICE_API_SECRET,
  quickbooksClientId: process.env.QUICKBOOKS_CLIENT_ID,
  quickbooksClientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
  xeroClientId: process.env.XERO_CLIENT_ID,
  xeroClientSecret: process.env.XERO_CLIENT_SECRET,
};

export function hasAirtableConfig() {
  return Boolean(env.airtableApiKey && env.airtableBaseId);
}

export function hasLiveAppBaseUrl() {
  return Boolean(env.appBaseUrl && !env.appBaseUrl.includes('localhost'));
}

export function isProductionLike() {
  return process.env.NODE_ENV === 'production' || hasLiveAppBaseUrl();
}

export function looksLikePlaceholder(value?: string | null) {
  if (!value) return true;
  return value.includes('example.com') || value.includes('change-me') || value.includes('replace-with-');
}

export function hasN8nConfig() {
  return Boolean(env.n8nWebhookBaseUrl && !looksLikePlaceholder(env.n8nWebhookBaseUrl));
}

export function hasPortalInviteSecret() {
  return Boolean(env.portalInviteSecret && !looksLikePlaceholder(env.portalInviteSecret));
}

export function hasOfficeAuthConfig() {
  return Boolean(env.officeAccessCode && !looksLikePlaceholder(env.officeAccessCode));
}

export function hasStaffRegisterSecret() {
  return Boolean(env.staffRegisterSecret && !looksLikePlaceholder(env.staffRegisterSecret));
}

export function hasDatabaseConfig() {
  return Boolean(env.databaseUrl && !looksLikePlaceholder(env.databaseUrl));
}

export type DataBackend = 'postgres' | 'airtable' | 'demo';

export function getDataBackend(): DataBackend {
  if (env.dataBackend === 'postgres' || env.dataBackend === 'airtable' || env.dataBackend === 'demo') {
    return env.dataBackend;
  }
  if (hasDatabaseConfig()) return 'postgres';
  if (hasAirtableConfig()) return 'airtable';
  return 'demo';
}

/** True when cases are read from and written to a real store (Postgres or Airtable), not demo data. */
export function hasLiveDataStore() {
  return getDataBackend() !== 'demo';
}

/** Staff email/password login needs a real user store (Postgres users table or Airtable Staff table). */
export function canUseStaffLogin() {
  return hasLiveDataStore();
}

export function hasOfficeAlertsConfig() {
  return Boolean(env.officeAlertWebhookUrl && !looksLikePlaceholder(env.officeAlertWebhookUrl));
}

export function hasWhatsappConfig() {
  return Boolean(
    (!looksLikePlaceholder(env.whatsappProviderWebhookUrl) && env.whatsappProviderWebhookUrl) ||
    (env.twilioAccountSid && env.twilioAuthToken && env.twilioWhatsappFrom),
  );
}

export function hasSmsConfig() {
  return Boolean(
    (!looksLikePlaceholder(env.smsProviderWebhookUrl) && env.smsProviderWebhookUrl) ||
    (env.twilioAccountSid && env.twilioAuthToken && env.twilioSmsFrom),
  );
}

export function hasEmailConfig() {
  return Boolean(
    (!looksLikePlaceholder(env.emailProviderWebhookUrl) && env.emailProviderWebhookUrl) ||
    (env.emailFromAddress && env.emailApiKey),
  );
}

export function hasGoogleConfig() {
  return Boolean(env.googleClientEmail && env.googlePrivateKey);
}

export function hasOcrConfig() {
  return Boolean(env.documentOcrWebhookUrl && !looksLikePlaceholder(env.documentOcrWebhookUrl));
}

export function hasAiReviewConfig() {
  return Boolean(env.aiReviewWebhookUrl && !looksLikePlaceholder(env.aiReviewWebhookUrl));
}

export function isLocalUploadMode() {
  return !env.uploadPublicBaseUrl;
}

export function hasSupabaseStorageConfig() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey && !looksLikePlaceholder(env.supabaseServiceRoleKey));
}

export function hasStripeConfig() {
  return Boolean(env.stripeSecretKey && !looksLikePlaceholder(env.stripeSecretKey));
}

export function hasIcountConfig() {
  return Boolean(env.icountCompanyId && env.icountUser && env.icountPassword);
}

export function hasGreenInvoiceConfig() {
  return Boolean(env.greenInvoiceApiKey && env.greenInvoiceApiSecret);
}

export function hasQuickbooksConfig() {
  return Boolean(env.quickbooksClientId && env.quickbooksClientSecret);
}

export function hasXeroConfig() {
  return Boolean(env.xeroClientId && env.xeroClientSecret);
}

export function hasAnyBillingProvider() {
  return hasStripeConfig() || hasIcountConfig() || hasGreenInvoiceConfig() || hasQuickbooksConfig() || hasXeroConfig();
}
