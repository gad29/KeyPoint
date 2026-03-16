# n8n workflow map

Concrete workflow artifacts now live under `n8n/workflows/`.

## Importable workflow files
1. `n8n/workflows/01-fillout-intake-to-airtable.json`
2. `n8n/workflows/02-office-approval-to-portal-invite.json`
3. `n8n/workflows/03-document-upload-review-queue.json`
4. `n8n/workflows/04-appraiser-dispatch.json`
5. `n8n/workflows/05-bank-follow-up-reminders.json`
6. `n8n/workflows/06-ai-review-handoff.json`
7. `n8n/workflows/07-client-status-notifications.json`

Config for n8n runtime variables lives in `n8n/.env.example`.

## Workflow 1: Fillout intake -> Airtable case/client creation
**Trigger:** webhook `keypoint/fillout-intake`

**Expected payload**
- `submissionId`
- `leadName`
- `phone`
- `email` (optional)
- `caseType`
- `borrowerProfiles[]`
- `bankTargets[]`
- `preferredLanguage`
- `assignedTo` (optional)

**What it does**
1. Validates required intake fields.
2. Builds a case ID if one was not supplied.
3. Upserts the client record in Airtable.
4. Upserts the case record in Airtable with stage `intake-submitted`.
5. Seeds case-document checklist rows based on borrower profile and case type.
6. Writes an activity log entry.
7. Sends an office alert webhook.

## Workflow 2: Office approval -> portal invite generation
**Trigger:** webhook `keypoint/office-approval`

**Expected payload**
- `caseId`
- `caseRecordId`
- `clientRecordId` (optional)
- `leadName`
- `phone`
- `preferredLanguage`
- `approvedBy`

**What it does**
1. Calls the existing app endpoint: `POST /api/invites`.
2. Updates Airtable case status to `portal-activated` / invited.
3. Updates client `Portal invited at` when client record ID is available.
4. Sends onboarding notification with the invite URL.
5. Logs the action in the activity log.

## Workflow 3: Document upload review queue
**Trigger:** webhook `keypoint/document-upload-review`

**Expected payload**
- `caseId`
- `caseDocumentRecordId`
- `documentCode`
- `fileUrl`
- `ocrSummary` (optional)
- `reviewNotes` (optional)

**What it does**
1. Moves the case document row to `under-review`.
2. Stores file URL and any OCR summary.
3. Writes an activity entry.
4. Notifies office/review queue.
5. Optionally hands the file to an OCR webhook.

## Workflow 4: Appraiser dispatch
**Trigger:** webhook `keypoint/appraiser-dispatch`

**Expected payload**
- `caseId`
- `region`
- `propertyAddress`
- `requestedVisitWindow`
- `valuationContext` (optional)
- `notes` (optional)

**What it does**
1. Loads matching appraisers from Airtable by region.
2. Selects the first available match.
3. Creates an appraisal job record.
4. Sends the outbound appraiser brief through a notification webhook.
5. Logs dispatch activity.

## Workflow 5: Bank follow-up/reminders
**Trigger:** webhook `keypoint/bank-followup-daily`

**Expected usage**
- Called daily by external cron or an n8n scheduler workflow.

**What it does**
1. Loads open bank runs (`requested` / `received`).
2. Flags stale requests older than 48 hours.
3. Flags offers expiring within 2 days.
4. Sends one batched office reminder payload.
5. Logs the scan in Airtable.

## Workflow 6: AI review handoff
**Trigger:** webhook `keypoint/ai-review-handoff`

**Expected payload**
- `caseId`
- `caseType`
- `borrowerProfiles[]`
- `stage`
- `incomeMonthly`
- `obligationsMonthly`
- `requestedMortgageAmount`
- `ltv`
- `documentSummaries[]`
- `bankStatus[]`
- `notes`

**What it does**
1. Removes direct PII from the handoff package.
2. Sends a compact review payload to an AI webhook.
3. Stores findings in the `AI reviews` table.
4. Writes activity log metadata.

## Workflow 7: Client status notifications
**Trigger:** webhook `keypoint/client-status-notify`

**Expected payload**
- `caseId`
- `stage`
- `phone` and/or `email`
- `preferredLanguage`
- `portalUrl` (optional)

**What it does**
1. Renders a Hebrew or English message by stage.
2. Sends it through the configured client notification webhook.
3. Logs outbound communication in Airtable.

## Notes for the MVP
- These files are intentionally practical drafts: importable shape, clear webhook contracts, and existing-app integration where available.
- Airtable linked-record fields may need final adjustment once the live base is created and record IDs are known.
- Message delivery, OCR, and AI review are designed as pluggable webhooks so the office can pick the approved providers later.
