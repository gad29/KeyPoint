export const env = {
  airtableApiKey: process.env.AIRTABLE_API_KEY,
  airtableBaseId: process.env.AIRTABLE_BASE_ID,
  airtableCasesTable: process.env.AIRTABLE_CASES_TABLE || 'Cases',
  airtableClientsTable: process.env.AIRTABLE_CLIENTS_TABLE || 'Clients',
  airtableDocumentsTable: process.env.AIRTABLE_DOCUMENTS_TABLE || 'Case documents',
  airtableActivityLogTable: process.env.AIRTABLE_ACTIVITY_LOG_TABLE || 'Activity log',
  n8nWebhookBaseUrl: process.env.N8N_WEBHOOK_BASE_URL,
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  keypointAppBaseUrl: process.env.KEYPOINT_APP_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:3000',
  portalInviteSecret: process.env.PORTAL_INVITE_SECRET || 'change-me',
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
