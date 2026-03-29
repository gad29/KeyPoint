# KeyPoint finish + deploy plan

This is the execution tracker for getting KeyPoint from working internal MVP to a deployable, testable rollout.

## Recently finished in repo
- [x] Removed the broken app-triggered native-intake n8n fallback from `POST /api/cases`
- [x] Shifted native post-intake automation docs toward Airtable-triggered workflows
- [x] Updated workflow `01-native-intake-post-create.json` to model Airtable-triggered office queue kickoff
- [x] Aligned repo docs with the current architecture: app owns core writes, n8n owns async orchestration

## Must finish before calling it deploy-ready

### A. Production app rollout
- [ ] Confirm the intended production host: Vercel or a specific VPS/reverse-proxy box
- [ ] Resolve the current domain mismatch: `keypoint.work` publicly resolves to `212.47.64.204`, while the KeyPoint workspace/n8n work here lives on `72.61.195.165`
- [ ] If Vercel is intended, point DNS to Vercel and attach `keypoint.work` + `www.keypoint.work`
- [ ] If a VPS is intended, deploy the app on that exact VPS and verify its nginx/app service chain
- [ ] Push the correct production env set into the actual production target
- [ ] Run a live smoke test on the production URL

### B. Native intake -> office queue path
- [ ] Replace/clean the live n8n native-intake workflow so it matches the repo version
- [ ] Ensure the live workflow is Airtable-triggered, not app-webhook-triggered
- [ ] Submit one real intake in production/test
- [ ] Verify Airtable records are created correctly:
  - [ ] Cases
  - [ ] Clients
  - [ ] Case documents
  - [ ] Activity log
- [ ] Verify office queue activity is logged once only
- [ ] Verify no duplicate writes happen

### C. Document upload review queue
- [ ] Verify upload storage path is acceptable for MVP
- [ ] If not, move uploads to durable/public storage
- [ ] Test upload webhook into n8n
- [ ] Test OCR handoff
- [ ] Test review/update path
- [ ] Test resubmission request path

### D. Office approval -> portal invite
- [ ] Verify workflow 02 is imported cleanly in live n8n
- [ ] Verify Airtable stage change to `approved` triggers invite generation
- [ ] Verify `POST /api/invites` succeeds from n8n
- [ ] Verify portal status is updated in Airtable
- [ ] Verify activity logging occurs once
- [ ] Verify outbound onboarding message actually sends

### E. Outbound messaging
- [ ] Finalize approved WhatsApp sending path
- [ ] Finalize SMS path if needed
- [ ] Finalize email path
- [ ] Test office alert delivery
- [ ] Test client-facing status updates

### F. OCR + AI review
- [ ] Decide whether OCR is in MVP scope for launch
- [ ] If yes, wire a real OCR endpoint and test it
- [ ] Decide whether AI review is in MVP scope for launch
- [ ] If yes, wire a real AI review endpoint and test it
- [ ] Confirm anonymization rules before enabling AI review

### G. Hardening
- [ ] Add retry/error handling in n8n
- [ ] Add failure notifications for external calls
- [ ] Check idempotency around invite creation and upload review
- [ ] Do one full end-to-end dress rehearsal

## Suggested execution order
1. Production env/domain verification
2. Live n8n cleanup for workflow 01
3. Real intake end-to-end test
4. Workflow 03 document upload review queue
5. Workflow 02 office approval -> portal invite
6. Messaging/provider finalization
7. Storage hardening
8. Optional OCR/AI review activation
9. Final dress rehearsal

## Practical definition of done
Only call KeyPoint deploy-ready when all of the following are true:
- production site is live on `keypoint.work`
- native intake creates real Airtable records
- office queue automation fires once and correctly
- portal invites can be generated from office approval
- uploads are stored reliably enough for the chosen deployment mode
- client/staff notifications actually deliver
- failures are visible and recoverable
