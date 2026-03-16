# KeyPoint

Initial scaffold for the KeyPoint Israel-focused mortgage advisor MVP.

## What exists now
- Next.js app structure for a client portal and office dashboard
- Seeded domain model for case stages, borrower profiles, documents, and bank offers
- Draft Airtable schema under `docs/airtable-schema.md`
- Draft n8n workflow map under `docs/n8n-workflows.md`
- Importable n8n workflow drafts under `n8n/workflows/` with setup notes in `n8n/README.md`
- Local repository layer for cases, invites, and uploads
- API endpoints for cases, invite generation, uploads, and n8n webhook forwarding
- Invite-based portal access flow and working upload page
- Product screens under:
  - `/`
  - `/portal`
  - `/office`
  - `/docs`
  - `/login`
  - `/invite/[token]`

## Intended stack
- Next.js for client/admin UI
- Airtable as MVP operations datastore
- n8n as automation backbone
- Fillout as intake entry point
- External payment tokenization provider

## Run
```bash
npm install
npm run dev
```

## Integration pack
- `docs/integration-checklist.md` — step-by-step go-live checklist
- `docs/fillout-setup.md` — Fillout intake structure and mapping
- `docs/deployment-notes.md` — Vercel/domain/env deployment notes
- `.env.production.example` — suggested production environment values
- `n8n/credentials-checklist.md` — n8n credential/env checklist

## Next build steps
1. Replace local repository reads with live Airtable tables once credentials are added
2. Add proper user authentication/session management beyond invite links
3. Connect uploads to cloud storage/provider of choice
4. Import/configure the draft n8n workflows under `n8n/workflows/` and wire real providers
5. Add production deployment config and branding polish
