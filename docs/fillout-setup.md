# KeyPoint Fillout setup

Fillout is the intake front door for KeyPoint.

## Recommended first form: mortgage intake
Create a Fillout form called `KeyPoint Mortgage Intake`.

## Suggested sections
1. Applicant details
2. Co-applicant details
3. Contact preferences
4. Case type
5. Income profile
6. Property details
7. Existing liabilities
8. Consent / authorization

## Suggested fields
### Applicant
- Full name
- Israeli ID number
- Phone
- Email
- Preferred language
- City

### Co-applicant
- Spouse / co-borrower full name
- Spouse / co-borrower ID number
- Spouse / co-borrower phone
- Spouse / co-borrower email

### Case profile
- Case type
  - purchase-single-dwelling
  - purchase-replacement-dwelling
  - purchase-investment-dwelling
  - refinance
  - all-purpose-against-home
  - discounted-program
  - self-build
  - renovation
- Borrower profile
  - salaried
  - self-employed
  - student
  - benefits
  - pensioner
  - new-immigrant
  - foreign-income
- Bank targets (multi-select)
- Notes

### Property
- Purchase price / estimated value
- Equity available
- City / neighborhood
- Property status

### Consent
- Consent to be contacted by WhatsApp
- Consent for document review
- Advisor authorization acknowledgment

## Webhook target
Configure the Fillout webhook to call the n8n intake workflow endpoint.

Recommended path:
- n8n workflow 01
- webhook slug: `keypoint/fillout-intake`

Payload should preserve:
- Fillout submission ID
- submission timestamp
- all applicant and case fields

## Mapping into Airtable
Fillout should map into:
- `Cases`
- `Clients`
- `Case documents`
- `Activity log`

## Important implementation notes
- Treat Fillout submission ID as the dedupe key
- Do not create duplicate cases if the same submission is replayed
- Keep case type and borrower profile values identical to KeyPoint internal enums where possible
- If Fillout field labels differ from internal names, map them in n8n rather than changing app logic

## MVP recommendation
Start with one strong intake form, not many forms. Add specialized forms only after the first workflow is stable.
