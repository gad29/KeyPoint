# KeyPoint n8n rebuild plan

This is the reset plan for the KeyPoint automation layer after the Fillout-era workflow model was retired.

## Core principle
Keep **system-of-record writes** in the app when they are part of the synchronous product flow.
Use **n8n for asynchronous orchestration and side effects**.

That means:
- the app owns intake submission and initial case creation
- the app owns client creation and checklist seeding
- the app owns invite token generation
- n8n owns notifications, OCR, reminders, AI handoff, and other async automations

## Why this reset is needed
The earlier n8n model assumed intake started outside the app and that n8n should create Airtable records.
That no longer matches KeyPoint.

The current live experiment also exposed webhook-registration quirks on this n8n instance, so the rebuild should minimize moving parts and validate one workflow at a time.

## MVP automation set
Build only these three workflows first.

### Workflow A — Native intake kickoff
Trigger:
- app webhook after successful native intake creation

Purpose:
- create an office-facing automation event
- optionally send office notification
- log a queue/triage activity row

Must not do:
- create the case again
- create clients again
- seed documents again

### Workflow B — Document upload review queue
Trigger:
- app upload webhook

Purpose:
- mark uploaded document under review
- route file to OCR/extraction
- update review notes/status
- request resubmission when needed

### Workflow C — Office approval -> portal invite
Trigger:
- Airtable case stage changes to `approved`

Purpose:
- call KeyPoint invite API
- send onboarding message
- mark portal invited
- log activity

## Later workflows
Only build these after A/B/C are stable:
- client status notifications
- bank reminders / follow-up
- appraiser dispatch
- AI review handoff

## Ownership map

### App-owned
- `/intake`
- `POST /api/cases` native intake path
- Airtable case/client/document/activity creation at intake time
- `POST /api/invites`
- upload persistence

### n8n-owned
- office alerts
- upload OCR/review orchestration
- portal-invite messaging
- scheduled reminders
- AI review handoff
- provider-specific delivery and retries

## Rebuild sequence
1. Archive the current experimental native-intake workflow in live n8n.
2. Remove app fallback hacks added only for the broken live webhook experiment.
3. Create a new minimal native-intake kickoff workflow with one clean webhook path.
4. Import and activate it normally.
5. Validate one live intake returns `automationTriggered: true`.
6. Rebuild document upload review queue.
7. Rebuild office approval -> portal invite.
8. Only then expand into the remaining workflows.

## Acceptance criteria
A rebuild is only considered done when:
- native intake succeeds without fallback webhook hacks
- native intake returns a clean automation result
- the workflow logs office review queue activity in Airtable
- document upload review queue works end-to-end
- office approval triggers invite generation and logging
- no workflow duplicates core app-owned Airtable writes

## Current live status snapshot
At time of writing:
- `[ARCHIVED] KeyPoint | Fillout intake -> Airtable case creation` exists but is inactive
- `KeyPoint | Native intake post-create kickoff` is active but considered experimental and should be replaced cleanly
- all other KeyPoint workflows are inactive
