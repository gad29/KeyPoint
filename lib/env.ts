export const env = {
  airtableApiKey: process.env.AIRTABLE_API_KEY,
  airtableBaseId: process.env.AIRTABLE_BASE_ID,
  airtableCasesTable: process.env.AIRTABLE_CASES_TABLE || 'Cases',
  airtableClientsTable: process.env.AIRTABLE_CLIENTS_TABLE || 'Clients',
  airtableDocumentsTable: process.env.AIRTABLE_DOCUMENTS_TABLE || 'Case documents',
  n8nWebhookBaseUrl: process.env.N8N_WEBHOOK_BASE_URL,
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  portalInviteSecret: process.env.PORTAL_INVITE_SECRET || 'change-me',
  uploadDir: process.env.UPLOAD_DIR || './data/uploads',
};

export function hasAirtableConfig() {
  return Boolean(env.airtableApiKey && env.airtableBaseId);
}
