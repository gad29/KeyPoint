# n8n paths the app calls

Base URL: `N8N_WEBHOOK_BASE_URL` (no trailing slash). Path is appended.

| Path | When |
|------|------|
| `keypoint/secretary-alert` | New intake |
| `keypoint/document-upload` | File uploaded |
| `keypoint/stage-review` | Stage change (anonymized payload; optional `AI_REVIEW_WEBHOOK_URL` overrides) |
| `keypoint/advisor-ready` | Case reaches ready-for-bank |
| `keypoint/offer-comparison` | Bank offer added (all offers for case, no personal names) |

Build AI + messaging in n8n: attach an LLM node to `stage-review` / `offer-comparison`, then email/WhatsApp/SMS nodes using your providers.
