# KeyPoint

KeyPoint is an Israel-focused mortgage advisor MVP built with Next.js, Airtable, and n8n, with a native in-app intake flow as the only active intake path.

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
### Vercel
- Put the values from `generated/vercel.env` into Vercel project env vars, or paste them directly from that file.
- Put the values from `n8n/.env.generated` into your n8n environment.
- Import the workflows from `n8n/workflows/`.
- Set `OFFICE_ACCESS_CODE` in production before exposing `/office` publicly.
- The app is now schema-aware against the live Airtable base, but keeping the field labels aligned with `docs/airtable-schema.md` is still the cleanest path.

### Self-hosted VPS / CloudPanel
- Copy `.env.production.example` to `.env.production.local`, or generate it via `npm run apply-settings`.
- Build with `npm run build`.
- Start with `pm2 start ecosystem.config.cjs`.
- Full guide: `docs/cloudpanel-vps-deploy.md`.

## Core routes
- `/` — public welcome page
- `/intake` — public native intake flow with post-submit document upload
- `/progress/:token` — read-only client progress page
- `/office` — internal staff workspace
- `/login` — progress-token entry + office entry

## Core API routes
- `GET /api/cases` — list cases (**office session** or disabled office mode)
- `POST /api/cases` — native intake (`source: native-intake`) is public; other creates require **office session**
- `GET /api/cases/:caseId` — fetch a case (**office session** or disabled office mode)
- `PATCH /api/cases/:caseId` — update case stage (**office session** or disabled office mode)
- `POST /api/invites` — generate a signed invite link (**office session** or disabled office mode)
- `POST /api/uploads` — save an upload and forward the event to n8n (requires a real `caseId`; size limit `UPLOAD_MAX_FILE_BYTES`, default 15 MiB)
- `POST /api/webhooks/n8n` — generic n8n forwarder (**office session**, or `x-keypoint-forwarder-secret` when `N8N_FORWARDER_SECRET` is set; in production with a live app URL, anonymous calls are rejected unless one of these applies)

## API hardening notes
- Set `OFFICE_ACCESS_CODE` in production before exposing `/office` or internal APIs (see middleware).
- Set `N8N_FORWARDER_SECRET` for server-to-server or n8n HTTP nodes that call `/api/webhooks/n8n` without a browser cookie.
- Set `PORTAL_INVITE_SECRET` to a long random value before issuing client progress links.

## Current operational model
- Cases load from Airtable when configured, otherwise sample data is used.
- Native intake submits to `POST /api/cases` with `source: 'native-intake'` and generates an internal submission ID for traceability.
- Native intake now creates a case row, primary client record, optional co-applicant client record, seeded case-document checklist rows, and an intake activity log in Airtable.
- Full intake answers are still serialized into case notes for the MVP so office staff keeps the richer context even when a dedicated Airtable field does not exist yet.
- Portal invites are signed and stateless; they no longer rely on local invite files.
- Client progress links now resolve under `/progress/:token` and are read-only.
- Uploads still default to local disk unless you route them onward through your automation/storage path.
- Upload events are forwarded to `keypoint/document-upload` on the configured n8n base URL.
- Office case updates persist back to Airtable, and advisor/bank offers can be written into the `Bank runs` table.
- Stage changes now prepare anonymized review payloads for n8n / AI-review hooks without client names.
- Native intake no longer depends on Fillout or the old intake webhook. Case creation happens directly in the app, and the n8n rebuild is being reset around Airtable-triggered post-create automation plus document-processing workflows.
- When Airtable is configured, invite generation and uploads also create Airtable activity/document records.

## Remaining real-world caveats
- Upload persistence is still local by default unless you connect a storage provider path.
- n8n provider credentials themselves may still require manual entry in n8n depending on the service.
- Office access can now be protected with an internal `OFFICE_ACCESS_CODE`; portal access remains invite-based.

## Important docs
- `docs/integration-checklist.md`
- `docs/deployment-notes.md`
- `docs/automation-implementation.md`
- `docs/n8n-workflows.md`
- `n8n/README.md`
