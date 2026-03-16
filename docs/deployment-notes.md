# KeyPoint deployment notes

## Current state
- Preview deploy works on Vercel
- Public access may still depend on Vercel preview protection settings
- Production domain target: `keypoint.work`

## Vercel production setup
### Suggested production env vars
- `APP_BASE_URL=https://keypoint.work`
- `KEYPOINT_APP_BASE_URL=https://keypoint.work`
- `PORTAL_INVITE_SECRET=<strong-random-secret>`
- `AIRTABLE_API_KEY=<airtable-token>`
- `AIRTABLE_BASE_ID=<base-id>`
- `AIRTABLE_CASES_TABLE=Cases`
- `AIRTABLE_CLIENTS_TABLE=Clients`
- `AIRTABLE_DOCUMENTS_TABLE=Case documents`
- `N8N_WEBHOOK_BASE_URL=<your-n8n-base-url>`
- `UPLOAD_DIR=./data/uploads` (temporary MVP local mode only)

## Domain wiring
In Vercel:
1. Add `keypoint.work`
2. Add `www.keypoint.work`
3. Apply the DNS records Vercel gives you
4. Set the production deployment as the one attached to the domain

## Recommended next production improvement
For MVP speed, you can deploy with local upload storage temporarily, but that is not ideal long-term. Better production options:
- Vercel Blob
- S3-compatible object storage
- Supabase Storage

## Health checks after deploy
- Home page loads
- `/office` loads
- `/login` loads
- `/api/cases` returns JSON
- invite generation works from office UI
- preview/production base URL used in generated invite links is correct

## Known remaining non-demo gaps
- real auth still needs improvement beyond invite-token access
- uploads are not yet cloud-backed by default
- Airtable and n8n need live credentials wired in
