# n8n workflow map

## Workflow 1: Fillout intake -> case creation
1. Receive Fillout submission webhook.
2. Validate mandatory intake fields.
3. Create or update Case record in Airtable.
4. Create Client record.
5. Seed Case documents from document library using case type + borrower profile rules.
6. Notify office WhatsApp / email that a new intake is waiting.

## Workflow 2: Office approval -> portal activation
1. Watch for Case stage moving to Approved / case opened.
2. Create portal invite token.
3. Send onboarding message with login link.
4. Log activity.

## Workflow 3: Document review queue
1. Watch Case document status changes.
2. Route uploaded files to OCR / extraction.
3. Write extracted metadata back to Airtable.
4. If rejected, send resubmission request with document-specific note.

## Workflow 4: Appraiser dispatch
1. Trigger when case is marked ready for appraisal.
2. Generate outbound brief.
3. Send appraiser request via approved messaging path.
4. Create appraisal job record.
5. Notify staff when response arrives or timeout hits.

## Workflow 5: Bank comparison support
1. Trigger when case reaches Ready for bank work.
2. Create bank run records for selected lenders.
3. Remind staff before approval-in-principle expiry.
4. Produce comparison summary for advisor review.

## Workflow 6: AI case review
1. Build anonymized case package.
2. Send to review agent.
3. Save findings in AI reviews table.
4. Create tasks for any missing docs / risks.

## Workflow 7: Client notifications
1. Stage-based message templates.
2. Send status changes via WhatsApp first.
3. Fall back to SMS/email when required.
4. Log outbound communication.
