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

function deriveWebhook(explicitUrl, baseUrl, suffix) {
  if (explicitUrl) return explicitUrl;
  if (!baseUrl) return '';
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
  AIRTABLE_API_KEY: airtable.apiKey || '',
  AIRTABLE_BASE_ID: airtable.baseId || '',
  AIRTABLE_CASES_TABLE: tables.cases || 'Cases',
  AIRTABLE_CLIENTS_TABLE: tables.clients || 'Clients',
  AIRTABLE_DOCUMENTS_TABLE: tables.documents || 'Case documents',
  AIRTABLE_ACTIVITY_LOG_TABLE: tables.activityLog || 'Activity log',
  N8N_WEBHOOK_BASE_URL: n8nBase,
  UPLOAD_DIR: storage.uploadDir || './data/uploads',
  UPLOAD_PUBLIC_BASE_URL: storage.uploadPublicBaseUrl || '',
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
    `- Airtable base configured: ${Boolean(appEnv.AIRTABLE_BASE_ID && appEnv.AIRTABLE_API_KEY)}`,
    `- n8n base URL: ${n8nBase || '(not set)'}`,
    `- WhatsApp endpoint: ${appEnv.WHATSAPP_PROVIDER_WEBHOOK_URL || '(not set)'}`,
    `- SMS endpoint: ${appEnv.SMS_PROVIDER_WEBHOOK_URL || '(not set)'}`,
    `- Email endpoint: ${appEnv.EMAIL_PROVIDER_WEBHOOK_URL || '(not set)'}`,
    `- OCR endpoint: ${appEnv.DOCUMENT_OCR_WEBHOOK_URL || '(not set)'}`,
    `- AI review endpoint: ${appEnv.AI_REVIEW_WEBHOOK_URL || '(not set)'}`,
    `- Upload mode: ${storage.mode || 'local'}`,
    '',
    'Generated files:',
    '- .env.local',
    '- .env.production.local',
    '- n8n/.env.generated',
    '- generated/vercel.env',
  ].join('\n'),
);

console.log('KeyPoint settings applied. Generated app + n8n env files.');
