# Advisor dashboard (`/admin`) and n8n billing

## Overview

- **URL:** `/admin` (after staff login). Requires a staff **Role** that is not blocked (see `docs/airtable-schema.md` → Staff → Role).
- **Data:** Reads **Finance transactions** from Airtable for totals and a recent table.
- **Automations:** POST from the app to n8n via `N8N_WEBHOOK_BASE_URL` + fixed path suffixes below. Each click also appends a row to **Billing events** when Airtable is configured.

## n8n webhook paths

Base URL is `N8N_WEBHOOK_BASE_URL` (no trailing slash issues are normalized in code).


| UI action        | HTTP POST path                             |
| ---------------- | ------------------------------------------ |
| Send invoice     | `{base}/keypoint/advisor/invoice`          |
| Send receipt     | `{base}/keypoint/advisor/receipt`          |
| Payment reminder | `{base}/keypoint/advisor/payment-reminder` |


## JSON payload (all three)

```json
{
  "kind": "invoice | receipt | reminder",
  "targetEmail": "client@example.com",
  "caseId": "optional case id string",
  "amount": 0,
  "dueDate": "optional ISO date string",
  "message": "optional free text",
  "clientName": "optional",
  "requestedAt": "ISO-8601",
  "requestedBy": "staff email from session"
}
```

`amount` may be omitted. Implement in n8n: Gmail / Outlook, PDF generator, WhatsApp provider, etc.

## Internal APIs (staff cookie + advisor role)

- `GET /api/admin/summary` — totals + up to 50 recent parsed transactions.
- `POST /api/admin/n8n/billing` — body as above; triggers n8n and logs to Airtable.
- `GET /api/auth/staff/me` — `{ email, role, canAccessAdminFinance }` for UI hints (optional).

## Environment

- `AIRTABLE_FINANCE_TRANSACTIONS_TABLE` (default: `Finance transactions`)
- `AIRTABLE_BILLING_EVENTS_TABLE` (default: `Billing events`)

