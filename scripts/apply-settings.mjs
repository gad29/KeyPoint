#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const appRoot = process.cwd();
const settingsPath = path.join(appRoot, 'keypoint.settings.json');
const examplePath = path.join(appRoot, 'keypoint.settings.example.json');
const generatedDir = path.join(appRoot, 'generated');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function envBlock(values) {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${String(value ?? '').replace(/\n/g, '\\n')}`)
    .join('\n') + '\n';
}

function looksLikePlaceholder(value) {
  if (!value) return true;
  return value.includes('example.com') || value.includes('change-me') || value.includes('replace-with-');
}

function deriveWebhook(explicitUrl, baseUrl, suffix) {
  if (explicitUrl && !looksLikePlaceholder(explicitUrl)) return explicitUrl;
  if (!baseUrl || looksLikePlaceholder(baseUrl)) return '';
  return `${baseUrl.replace(/\/$/, '')}/${suffix.replace(/^\//, '')}`;
}

if (!fs.existsSync(settingsPath)) {
  console.error('Missing keypoint.settings.json');
  console.error(`Copy ${path.basename(examplePath)} to keypoint.settings.json and fill in your real values.`);
  process.exit(1);
}

const settings = readJson(settingsPath);
ensureDir(generatedDir);

const appBaseUrl = settings.app?.baseUrl || 'http://localhost:3000';
const n8nBase = settings.n8n?.webhookBaseUrl || '';
const connections = settings.connections || {};
const storage = settings.storage || {};
const airtable = settings.airtable || {};
const tables = airtable.tables || {};

const appEnv = {
  APP_BASE_URL: appBaseUrl,
  KEYPOINT_APP_BASE_URL: appBaseUrl,
  PORTAL_INVITE_SECRET: settings.app?.portalInviteSecret || 'change-me',
  OFFICE_ACCESS_CODE: settings.app?.officeAccessCode || '',
  OFFICE_SESSION_SECRET: settings.app?.officeSessionSecret || '',
  OFFICE_SESSION_HOURS: settings.app?.officeSessionHours || 12,
  STAFF_SESSION_SECRET: settings.app?.staffSessionSecret || '',
  STAFF_REGISTER_SECRET: settings.app?.staffRegisterSecret || '',
  N8N_FORWARDER_SECRET: settings.app?.n8nForwarderSecret || '',
  AIRTABLE_API_KEY: airtable.apiKey || '',
  AIRTABLE_BASE_ID: airtable.baseId || '',
  AIRTABLE_CASES_TABLE: tables.cases || 'Cases',
  AIRTABLE_CLIENTS_TABLE: tables.clients || 'Clients',
  AIRTABLE_DOCUMENTS_TABLE: tables.documents || 'Case documents',
  AIRTABLE_BANK_RUNS_TABLE: tables.bankRuns || 'Bank runs',
  AIRTABLE_ACTIVITY_LOG_TABLE: tables.activityLog || 'Activity log',
  AIRTABLE_AI_REVIEWS_TABLE: tables.aiReviews || 'AI reviews',
  AIRTABLE_STAFF_TABLE: tables.staff || 'Staff',
  AIRTABLE_FINANCE_TRANSACTIONS_TABLE: tables.financeTransactions || 'Finance transactions',
  AIRTABLE_BILLING_EVENTS_TABLE: tables.billingEvents || 'Billing events',
  N8N_WEBHOOK_BASE_URL: n8nBase,
  UPLOAD_DIR: storage.uploadDir || './data/uploads',
  UPLOAD_PUBLIC_BASE_URL: storage.uploadPublicBaseUrl || '',
  UPLOAD_MAX_FILE_BYTES: storage.maxFileBytes != null ? String(storage.maxFileBytes) : '15728640',
  OFFICE_ALERT_WEBHOOK_URL: deriveWebhook(connections.officeAlerts?.webhookUrl, n8nBase, 'keypoint/office-alert'),
  WHATSAPP_PROVIDER_WEBHOOK_URL: deriveWebhook(connections.whatsapp?.webhookUrl, n8nBase, 'keypoint/provider/whatsapp'),
  SMS_PROVIDER_WEBHOOK_URL: deriveWebhook(connections.sms?.webhookUrl, n8nBase, 'keypoint/provider/sms'),
  EMAIL_PROVIDER_WEBHOOK_URL: deriveWebhook(connections.email?.webhookUrl, n8nBase, 'keypoint/provider/email'),
  DOCUMENT_OCR_WEBHOOK_URL: deriveWebhook(connections.ocr?.webhookUrl, n8nBase, 'keypoint/provider/ocr'),
  AI_REVIEW_WEBHOOK_URL: deriveWebhook(connections.aiReview?.webhookUrl, n8nBase, 'keypoint/provider/ai-review'),
  TWILIO_ACCOUNT_SID: connections.twilio?.accountSid || '',
  TWILIO_AUTH_TOKEN: connections.twilio?.authToken || '',
  TWILIO_WHATSAPP_FROM: connections.twilio?.whatsappFrom || connections.whatsapp?.fromNumber || '',
  TWILIO_SMS_FROM: connections.twilio?.smsFrom || connections.sms?.fromNumber || '',
  EMAIL_FROM_ADDRESS: connections.email?.fromAddress || '',
  EMAIL_REPLY_TO: connections.email?.replyTo || '',
  EMAIL_API_KEY: connections.email?.apiKey || '',
  GOOGLE_CLIENT_EMAIL: connections.google?.clientEmail || '',
  GOOGLE_PRIVATE_KEY: connections.google?.privateKey || '',
  GOOGLE_DRIVE_FOLDER_ID: connections.google?.driveFolderId || '',
  GOOGLE_SHEETS_SPREADSHEET_ID: connections.google?.sheetsSpreadsheetId || '',
};

const n8nEnv = {
  AIRTABLE_BASE_ID: appEnv.AIRTABLE_BASE_ID,
  AIRTABLE_CASES_TABLE: appEnv.AIRTABLE_CASES_TABLE,
  AIRTABLE_CLIENTS_TABLE: appEnv.AIRTABLE_CLIENTS_TABLE,
  AIRTABLE_DOCUMENT_LIBRARY_TABLE: tables.documentLibrary || 'Document library',
  AIRTABLE_DOCUMENTS_TABLE: appEnv.AIRTABLE_DOCUMENTS_TABLE,
  AIRTABLE_BANK_RUNS_TABLE: appEnv.AIRTABLE_BANK_RUNS_TABLE,
  AIRTABLE_APPRAISERS_TABLE: tables.appraisers || 'Appraisers',
  AIRTABLE_APPRAISAL_JOBS_TABLE: tables.appraisalJobs || 'Appraisal jobs',
  AIRTABLE_ACTIVITY_LOG_TABLE: appEnv.AIRTABLE_ACTIVITY_LOG_TABLE,
  AIRTABLE_AI_REVIEWS_TABLE: appEnv.AIRTABLE_AI_REVIEWS_TABLE,
  KEYPOINT_APP_BASE_URL: appEnv.KEYPOINT_APP_BASE_URL,
  OFFICE_ALERT_WEBHOOK_URL: appEnv.OFFICE_ALERT_WEBHOOK_URL,
  WHATSAPP_PROVIDER_WEBHOOK_URL: appEnv.WHATSAPP_PROVIDER_WEBHOOK_URL,
  SMS_PROVIDER_WEBHOOK_URL: appEnv.SMS_PROVIDER_WEBHOOK_URL,
  EMAIL_PROVIDER_WEBHOOK_URL: appEnv.EMAIL_PROVIDER_WEBHOOK_URL,
  DOCUMENT_OCR_WEBHOOK_URL: appEnv.DOCUMENT_OCR_WEBHOOK_URL,
  AI_REVIEW_WEBHOOK_URL: appEnv.AI_REVIEW_WEBHOOK_URL,
  TWILIO_ACCOUNT_SID: appEnv.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: appEnv.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM: appEnv.TWILIO_WHATSAPP_FROM,
  TWILIO_SMS_FROM: appEnv.TWILIO_SMS_FROM,
  EMAIL_FROM_ADDRESS: appEnv.EMAIL_FROM_ADDRESS,
  EMAIL_REPLY_TO: appEnv.EMAIL_REPLY_TO,
  EMAIL_API_KEY: appEnv.EMAIL_API_KEY,
  GOOGLE_CLIENT_EMAIL: appEnv.GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY: appEnv.GOOGLE_PRIVATE_KEY,
  GOOGLE_DRIVE_FOLDER_ID: appEnv.GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_SHEETS_SPREADSHEET_ID: appEnv.GOOGLE_SHEETS_SPREADSHEET_ID,
};

fs.writeFileSync(path.join(appRoot, '.env.local'), envBlock(appEnv));
fs.writeFileSync(path.join(appRoot, '.env.production.local'), envBlock(appEnv));
fs.writeFileSync(path.join(appRoot, 'n8n', '.env.generated'), envBlock(n8nEnv));
fs.writeFileSync(path.join(generatedDir, 'vercel.env'), envBlock(appEnv));
fs.writeFileSync(
  path.join(generatedDir, 'connections-summary.md'),
  [
    '# KeyPoint generated connection summary',
    '',
    `- App base URL: ${appBaseUrl}`,
    `- App base URL looks live: ${!looksLikePlaceholder(appBaseUrl) && !appBaseUrl.includes('localhost')}`,
    `- Portal invite secret looks real: ${!looksLikePlaceholder(appEnv.PORTAL_INVITE_SECRET)}`,
    `- Office access code configured: ${Boolean(appEnv.OFFICE_ACCESS_CODE)}`,
    `- Staff session secret set: ${Boolean(appEnv.STAFF_SESSION_SECRET)}`,
    `- Staff self-register secret set: ${Boolean(appEnv.STAFF_REGISTER_SECRET)}`,
    `- Airtable base configured: ${Boolean(appEnv.AIRTABLE_BASE_ID && appEnv.AIRTABLE_API_KEY)}`,
    `- n8n base URL: ${n8nBase || '(not set)'}`,
    `- n8n base URL looks real: ${Boolean(n8nBase && !looksLikePlaceholder(n8nBase))}`,
    `- n8n forwarder secret set: ${Boolean(appEnv.N8N_FORWARDER_SECRET)}`,
    `- Office alerts endpoint: ${appEnv.OFFICE_ALERT_WEBHOOK_URL || '(not set)'}`,
    `- WhatsApp endpoint: ${appEnv.WHATSAPP_PROVIDER_WEBHOOK_URL || '(not set)'}`,
    `- SMS endpoint: ${appEnv.SMS_PROVIDER_WEBHOOK_URL || '(not set)'}`,
    `- Email endpoint: ${appEnv.EMAIL_PROVIDER_WEBHOOK_URL || '(not set)'}`,
    `- OCR endpoint: ${appEnv.DOCUMENT_OCR_WEBHOOK_URL || '(not set)'}`,
    `- AI review endpoint: ${appEnv.AI_REVIEW_WEBHOOK_URL || '(not set)'}`,
    `- Upload mode: ${storage.mode || 'local'}`,
    `- Upload public base URL set: ${Boolean(appEnv.UPLOAD_PUBLIC_BASE_URL)}`,
    '',
    'Generated files:',
    '- .env.local',
    '- .env.production.local',
    '- n8n/.env.generated',
    '- generated/vercel.env',
  ].join('\n'),
);

console.log('KeyPoint settings applied. Generated app + n8n env files.');
