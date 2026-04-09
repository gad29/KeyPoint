export const env = {
  airtableApiKey: process.env.AIRTABLE_API_KEY,
  airtableBaseId: process.env.AIRTABLE_BASE_ID,
  airtableCasesTable: process.env.AIRTABLE_CASES_TABLE || 'Cases',
  airtableClientsTable: process.env.AIRTABLE_CLIENTS_TABLE || 'Clients',
  airtableDocumentsTable: process.env.AIRTABLE_DOCUMENTS_TABLE || 'Case documents',
  airtableActivityLogTable: process.env.AIRTABLE_ACTIVITY_LOG_TABLE || 'Activity log',
  airtableBankRunsTable: process.env.AIRTABLE_BANK_RUNS_TABLE || 'Bank runs',
  airtableAiReviewsTable: process.env.AIRTABLE_AI_REVIEWS_TABLE || 'AI reviews',
  n8nWebhookBaseUrl: process.env.N8N_WEBHOOK_BASE_URL,
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  keypointAppBaseUrl: process.env.KEYPOINT_APP_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:3000',
  portalInviteSecret: process.env.PORTAL_INVITE_SECRET || 'change-me',
  officeAccessCode: process.env.OFFICE_ACCESS_CODE,
  officeSessionSecret: process.env.OFFICE_SESSION_SECRET,
  officeSessionHours: process.env.OFFICE_SESSION_HOURS || '12',
  uploadDir: process.env.UPLOAD_DIR || './data/uploads',
  uploadPublicBaseUrl: process.env.UPLOAD_PUBLIC_BASE_URL,
  officeAlertWebhookUrl: process.env.OFFICE_ALERT_WEBHOOK_URL,
  whatsappProviderWebhookUrl: process.env.WHATSAPP_PROVIDER_WEBHOOK_URL,
  smsProviderWebhookUrl: process.env.SMS_PROVIDER_WEBHOOK_URL,
  emailProviderWebhookUrl: process.env.EMAIL_PROVIDER_WEBHOOK_URL,
  documentOcrWebhookUrl: process.env.DOCUMENT_OCR_WEBHOOK_URL,
  aiReviewWebhookUrl: process.env.AI_REVIEW_WEBHOOK_URL,
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
