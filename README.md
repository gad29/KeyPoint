# KeyPoint

KeyPoint is an Israel-focused mortgage advisor MVP built with Next.js, Airtable, n8n, and Fillout.

## What is ready now
- Next.js app scaffold for overview, office dashboard, portal, docs, login, and signed invite links
- Airtable-backed case loading through the repository layer
- n8n webhook bridge for workflow forwarding and upload events
- Draft workflow pack under `n8n/workflows/`
- Single settings-file generator for app env + n8n env output
- Integration docs for Airtable, Fillout, deployment, and workflow rollout

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

## Current operational model
- Cases load from Airtable when configured, otherwise sample data is used.
- Portal invites are signed and stateless; they no longer rely on local invite files.
- Uploads still default to local disk unless you route them onward through your automation/storage path.
- Upload events are forwarded to `keypoint/document-upload` on the configured n8n base URL.

## Remaining real-world caveats
- Upload persistence is still local by default unless you connect a storage provider path.
- n8n provider credentials themselves may still require manual entry in n8n depending on the service.
- Real auth is still lightweight; portal access is invite-based.

## Important docs
- `docs/integration-checklist.md`
- `docs/fillout-setup.md`
- `docs/deployment-notes.md`
- `docs/automation-implementation.md`
- `n8n/README.md`
