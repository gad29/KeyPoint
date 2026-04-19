# Airtable schema draft

## 1. Cases

Core mortgage case record.

Fields:

- Case ID
- Lead name
- Spouse name
- Phone
- Email
- Case type
- Borrower profiles (multi-select)
- Current stage
- Assigned staff
- Missing items count
- Appraiser status
- Recommendation status
- Client portal status
- Fillout submission id (legacy field currently reused to store the app-generated submission ID)
- Notes

## 2. Clients

Normalized client profile and login/contact metadata.

Fields:

- Client ID
- Case link
- Full name
- ID number
- Preferred language
- WhatsApp number
- Portal invited at
- Last portal activity

## Current live-base compatibility note

The current live KeyPoint Airtable base is flatter than the idealized schema above:

- `Cases.Borrower profiles` is currently text, not a true multi-select field
- `Clients.Case link`, `Case documents.Case link`, and `Activity log.Case link` are currently text, not linked records

The app now writes to the live base in that compatible text-first format so native intake works end-to-end against the existing production Airtable base.

As of the latest hardening pass, the app also introspects Airtable table metadata and resolves field names case-insensitively / alias-first where practical, so small label drift is less likely to break create, update, invite, or offer flows outright.

## 3. Document library

Master list of supported documents.

Fields:

- Document code
- Group
- English label
- Hebrew label
- Description
- Default relevance logic
- Borrower profile applicability
- Case type applicability

## 4. Case documents

Per-case document checklist and review state.

Fields:

- Case link
- Document library link
- Required?
- Status
- Uploaded file URL
- OCR summary
- Review notes
- Requested resubmission at
- Approved at

## 5. Bank runs

Tracks requests and approvals-in-principle by bank.

Fields:

- Case link
- Bank name
- Requested at
- Status
- First payment
- Max payment
- Total repayment
- Total interest
- Expiry date
- Conditions / comments

## 6. Appraisers

Appraiser vendor directory.

Fields:

- Appraiser ID
- Name
- Region
- WhatsApp number
- Email
- Notes

## 7. Appraisal jobs

Case-specific appraisal workflow.

Fields:

- Case link
- Appraiser link
- Referral sent at
- Visit scheduled for
- Valuation received at
- Valuation amount
- Invoice amount
- Payment status
- Exceptions / notes

## 8. Activity log

Audit-friendly timeline.

Fields:

- Case link
- Actor
- Event type
- Summary
- Source system
- Timestamp

## 9. AI reviews

Stores anonymized review requests and outputs.

Fields:

- Case link
- Triggered by
- Anonymized payload ref
- Review status
- Findings summary
- Missing items found
- Risk flags
- Suggested next steps

## 10. Staff (office login)

Used for email + password sign-in to `/office`. Passwords are **bcrypt hashes** only (never store plain text). Use a **Long text** field for the hash if single-line truncates.

Fields (names expected by the app; adjust in code if your base differs):

- Email (single line; stored lowercase)
- Password hash (long text recommended)
- Full name (optional)
- Active (checkbox; unchecked users cannot sign in)
- Role (single line or single select): `advisor`, `admin`, or `owner` can open `/admin` (finance dashboard). Values such as `secretary`, `reception`, or `viewer` cannot. If empty, the app treats the user as `advisor`.

## 11. Finance transactions (advisor dashboard)

Used by `/admin` for income vs expense totals. Create a table with this name or set `AIRTABLE_FINANCE_TRANSACTIONS_TABLE`.

Suggested fields:

- Date (date) — or `Occurred on`
- Type (single select or single line): `income` / `expense` (Hebrew labels containing הכנסה / הוצאה also work)
- Amount (number or currency)
- Category (optional)
- Description (long text, optional)
- Case ID (optional, text) — link to your case id for reporting

The app loads up to 300 rows and filters approximately to the last 90 days by `Date` when present.

## 12. Billing events (advisor → n8n audit log)

Optional log row when an advisor triggers invoice / receipt / reminder from the dashboard. Table name `Billing events` or `AIRTABLE_BILLING_EVENTS_TABLE`.

Suggested fields:

- Kind (single line): `invoice`, `receipt`, `reminder`
- Created at (single line ISO timestamp is fine)
- Target email
- Case ID (optional)
- Amount (optional, number)
- Notes (long text) — includes n8n success/failure summary