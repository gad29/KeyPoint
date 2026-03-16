# KeyPoint automation implementation notes

## Workflow-to-table mapping

### 1) Fillout intake -> Airtable case/client creation
- Trigger: public Fillout webhook -> `keypoint/fillout-intake`
- Writes:
  - `Cases`
  - `Clients`
  - `Case documents`
  - `Activity log`
- External calls:
  - office alert webhook

### 2) Office approval -> portal invite generation
- Trigger: Airtable record update in `Cases`
- Reads:
  - `Cases`
- Writes:
  - `Cases`
  - `Activity log`
- External calls:
  - KeyPoint app `POST /api/invites`
  - WhatsApp provider

### 3) Document upload review queue
- Trigger: upload event webhook -> `keypoint/document-upload`
- Writes:
  - `Case documents`
- External calls:
  - OCR/extraction endpoint
  - WhatsApp resubmission template
  - office review queue alert

### 4) Appraiser dispatch
- Trigger: `Cases.Current stage = waiting-appraiser`
- Reads:
  - `Appraisers`
- Writes:
  - `Appraisal jobs`
- External calls:
  - WhatsApp provider
  - office timeout alert

### 5) Bank follow-up/reminders
- Trigger: daily cron
- Reads/Writes:
  - `Bank runs`
  - `Activity log`
- External calls:
  - office alert webhook

### 6) AI review handoff
- Trigger: `Cases.Current stage in [secretary-review, ready-for-bank]`
- Reads:
  - `Case documents`
- Writes:
  - `AI reviews`
- External calls:
  - AI review webhook
  - office follow-up alert

### 7) Client status notifications
- Trigger: case stage changes in `Cases`
- Reads:
  - `Clients`
- Writes:
  - `Activity log`
- External calls:
  - WhatsApp provider
  - email fallback provider

## Airtable field alignment notes
The existing schema doc is close, but the workflow exports assume these exact field labels:
- Cases: `Lead name`, `Spouse name`, `Phone`, `Email`, `Case type`, `Borrower profiles`, `Current stage`, `Assigned staff`, `Missing items count`, `Client portal status`, `Fillout submission id`, `Notes`
- Clients: `Case link`, `Full name`, `ID number`, `Preferred language`, `WhatsApp number`, `Email`
- Case documents: `Case link`, `Document code`, `Required?`, `Status`, `Uploaded file URL`, `OCR summary`, `Review notes`, `Requested resubmission at`, `Approved at`
- Activity log: `Case link`, `Actor`, `Event type`, `Summary`, `Source system`, `Timestamp`

## Suggested production hardening before activation
- add deduplication on Fillout submission ID
- enforce idempotency on invite creation and upload review
- move WhatsApp/email text into Airtable or a proper template store
- add dead-letter/error notifications for any failed external call
- add per-workflow retry/backoff and circuit-breaker rules in n8n
- replace generic webhooks with provider-specific signed callbacks
