# KeyPoint integration checklist

Use this checklist to move KeyPoint from preview/demo mode into a fully wired MVP.

## 0) Settings-driven bootstrap
- [ ] Copy `keypoint.settings.example.json` to `keypoint.settings.json`
- [ ] Fill in base URLs, Airtable values, messaging values, email values, and any Google/Twilio details you want to use
- [ ] Run `npm run apply-settings`
- [ ] Review `generated/connections-summary.md`
- [ ] Push `generated/vercel.env` values into Vercel
- [ ] Push `n8n/.env.generated` values into n8n

## 1) Domain + deployment
- [ ] Confirm `keypoint.work` DNS is under your control
- [ ] Add `keypoint.work` and `www.keypoint.work` to the Vercel project
- [ ] Point DNS records to Vercel
- [ ] Promote a production deployment only after Airtable + core automation are wired

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
- [ ] Record the Base ID and token in `keypoint.settings.json`

## 3) Native intake
- [ ] Confirm `/intake` is the only public intake entrypoint you want to use
- [ ] Test a real native intake submission end to end
- [ ] Verify new submissions create the expected `Cases`, `Clients`, `Case documents`, and `Activity log` rows
- [ ] Verify the internal submission ID is enough for tracing and support

## 4) n8n
- [ ] Import workflow drafts from `n8n/workflows/`
- [ ] Create Airtable credentials in n8n
- [ ] Load values from `n8n/.env.generated`
- [ ] Replace any remaining placeholder webhook URLs with real endpoints/providers
- [ ] Test each workflow independently before activation
- [ ] Turn on retry/error notifications in n8n
- [ ] Decide which post-intake automations should run after native intake, since intake creation itself now happens in-app

## 5) Messaging
- [ ] Decide the approved outbound WhatsApp provider path
- [ ] Decide the SMS provider path if SMS is needed
- [ ] Decide the email provider path
- [ ] Confirm sender numbers / sender email addresses in `keypoint.settings.json`
- [ ] Test office alert notifications
- [ ] Test client-facing status updates

## 6) OCR + AI review
- [ ] Choose OCR/extraction provider or internal endpoint
- [ ] Choose AI review endpoint/agent
- [ ] Confirm anonymization rules for AI review payloads
- [ ] Test document upload -> OCR -> review loop

## 7) Storage
- [ ] Decide whether local upload storage is acceptable for MVP
- [ ] If not, add a durable upload/storage path and set `UPLOAD_PUBLIC_BASE_URL` or downstream automation accordingly
- [ ] Confirm uploaded document references are available to n8n and reviewers

## 8) Go-live gate
Only call it ready for live use when all of these are true:
- [ ] production deploy works on `keypoint.work`
- [ ] native intake creates real Airtable records
- [ ] office approval sends real portal invite links
- [ ] uploads are stored reliably
- [ ] status notifications reach users
- [ ] error handling exists for failed external calls
