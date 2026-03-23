# KeyPoint

KeyPoint is an Israel-focused mortgage advisor MVP built with Next.js, Airtable, and n8n, with a native in-app intake flow now preferred over Fillout.

## What is ready now
- Next.js app scaffold for overview, public intake, office dashboard, portal, docs, login, and signed invite links
- Polished native multi-step intake under `/intake`
- Airtable-backed case loading through the repository layer
- Live case creation endpoint and case-stage update endpoint
- n8n webhook bridge for workflow forwarding and upload events
- Importable workflow pack under `n8n/workflows/`
- Single settings-file generator for app env + n8n env output
- Integration docs for Airtable, deployment, and workflow rollout

## Single settings file flow
1. Copy the example:
   ```bash
   cp keypoint.settings.example.json keypoint.settings.json
   ```
2. Fill in your real credentials, phone numbers, email address, webhook URLs, and provider values.
3. Generate env files:
   ```bash
   npm run apply-settings
   ```
4. Generated outputs:
   - `.env.local`
   - `.env.production.local`
   - `n8n/.env.generated`
   - `generated/vercel.env`
   - `generated/connections-summary.md`

## Run locally
```bash
npm install
npm run apply-settings   # after keypoint.settings.json exists
npm run dev
```

## Deploy
- Put the values from `generated/vercel.env` into Vercel project env vars, or paste them directly from that file.
- Put the values from `n8n/.env.generated` into your n8n environment.
- Import the workflows from `n8n/workflows/`.
- Confirm Airtable field names match `docs/airtable-schema.md`.

## Core routes
- `/intake` — public native intake flow
- `/office` — staff dashboard
- `/portal` — client portal shell
- `/docs` — build/integration notes

## Core API routes
- `GET /api/cases` — list cases
- `POST /api/cases` — create a live case in Airtable or submit a native intake payload
- `GET /api/cases/:caseId` — fetch a case
- `PATCH /api/cases/:caseId` — update case stage
- `POST /api/invites` — generate a signed invite link
- `POST /api/uploads` — save an upload and forward the event to n8n
- `POST /api/webhooks/n8n` — generic n8n forwarder

## Current operational model
- Cases load from Airtable when configured, otherwise sample data is used.
- Native intake submits to `POST /api/cases` with `source: 'native-intake'` and generates an internal submission ID as the current replacement for the old Fillout submission reference.
- Native intake now creates a case row, primary client record, optional co-applicant client record, seeded case-document checklist rows, and an intake activity log in Airtable.
- Full intake answers are still serialized into case notes for the MVP so office staff keeps the richer context even when a dedicated Airtable field does not exist yet.
- Portal invites are signed and stateless; they no longer rely on local invite files.
- Uploads still default to local disk unless you route them onward through your automation/storage path.
- Upload events are forwarded to `keypoint/document-upload` on the configured n8n base URL.
- When n8n is configured, native intake also forwards a richer normalized payload to `keypoint/fillout-intake`, including applicant/co-applicant, contact, financial, property, consent, and required-document context so the existing office automation path can continue working without relying only on a few top-level fields.
- When Airtable is configured, invite generation and uploads also create Airtable activity/document records.

## Remaining real-world caveats
- Upload persistence is still local by default unless you connect a storage provider path.
- n8n provider credentials themselves may still require manual entry in n8n depending on the service.
- Real auth is still lightweight; portal access is invite-based.

## Important docs
- `docs/integration-checklist.md`
- `docs/deployment-notes.md`
- `docs/automation-implementation.md`
- `docs/n8n-workflows.md`
- `n8n/README.md`
