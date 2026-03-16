# KeyPoint integration checklist

Use this checklist to move KeyPoint from preview/demo mode into a fully wired MVP.

## 1) Domain + deployment
- [ ] Confirm `keypoint.work` DNS is under your control
- [ ] Add `keypoint.work` and `www.keypoint.work` to the Vercel project
- [ ] Point DNS records to Vercel
- [ ] Set production env vars in Vercel
- [ ] Promote a production deployment only after Airtable + n8n are wired

## 2) Airtable
- [ ] Create the base for KeyPoint operations
- [ ] Add these tables:
  - [ ] Cases
  - [ ] Clients
  - [ ] Document library
  - [ ] Case documents
  - [ ] Bank runs
  - [ ] Appraisers
  - [ ] Appraisal jobs
  - [ ] Activity log
  - [ ] AI reviews
- [ ] Match field names to `docs/airtable-schema.md`
- [ ] Create an API token with access to the KeyPoint base
- [ ] Record the Base ID and token for env setup

## 3) Fillout
- [ ] Create the public intake form in Fillout
- [ ] Add fields matching the KeyPoint intake contract
- [ ] Configure webhook delivery to n8n workflow 01
- [ ] Capture Fillout submission ID for deduplication
- [ ] Test a real submission end to end

## 4) n8n
- [ ] Import workflow drafts from `n8n/workflows/`
- [ ] Create Airtable credentials in n8n
- [ ] Set n8n environment variables from `n8n/.env.example`
- [ ] Replace placeholder webhook URLs with real endpoints/providers
- [ ] Test each workflow independently before activation
- [ ] Turn on retry/error notifications in n8n

## 5) Messaging
- [ ] Decide the approved outbound WhatsApp provider path
- [ ] Wire WhatsApp webhook endpoint into n8n env
- [ ] Wire fallback email endpoint/provider
- [ ] Test office alert notifications
- [ ] Test client-facing status updates

## 6) OCR + AI review
- [ ] Choose OCR/extraction provider or internal endpoint
- [ ] Choose AI review endpoint/agent
- [ ] Confirm anonymization rules for AI review payloads
- [ ] Test document upload -> OCR -> review loop

## 7) KeyPoint app
- [ ] Set production `APP_BASE_URL`
- [ ] Set `PORTAL_INVITE_SECRET`
- [ ] Decide whether upload storage stays local for MVP or moves to cloud storage
- [ ] Confirm `/api/invites` is reachable from n8n in production
- [ ] Smoke-test `/office`, `/portal`, `/login`, and invite links

## 8) Go-live gate
Only call it ready for live use when all of these are true:
- [ ] production deploy works on `keypoint.work`
- [ ] Fillout creates real Airtable records
- [ ] office approval sends real portal invite links
- [ ] uploads are stored reliably
- [ ] status notifications reach users
- [ ] error handling exists for failed external calls
