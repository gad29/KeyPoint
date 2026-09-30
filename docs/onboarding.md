# Client onboarding

How a business gets a new client from "interested" to "file ready": details, documents and a signed agreement, without email ping-pong.

## The flow

1. **Share a link.** Admin → *Onboarding* (`/admin/onboarding`) lists your templates. Each one has a link (`/w/<template>`) you can copy or send over WhatsApp.
2. **The client fills it in.** Their details, then your questions, then (if the template has one) the agreement: they read it, tick "I agree" and sign with a finger or mouse. Progress is saved in their browser, so they can close the tab and continue later.
3. **Documents.** Right after submitting, the client sees the template's document list and can upload files straight away (with a progress bar).
4. **Personal link.** The client also gets a personal link (`/progress/<token>`) to follow their file and upload the rest later. It's valid for 30 days and contains no personal data.
5. **You review.** The new case appears in the office. The *Documents* tab shows each file with a download link; approve or ask for a re-upload.
6. **One-click reminder.** Still missing something? *Documents* → *Prepare reminder* writes a polite message (Hebrew or English) listing exactly what's missing, with a fresh personal link. Send it via **WhatsApp** (works with no setup), **copy** it, or **send automatically** through n8n (workflow 13).

## Templates

A template has:

| Part | Notes |
|---|---|
| Steps and fields | Short/long text, email, phone, number, date, single or multiple choice, and a confirmation checkbox. Any field can be required. Hebrew and English labels. |
| Contact fields | Full name, phone and email are always present (locked) so every client can be reached. |
| Documents | What the client should upload. Required ones count as "missing" until received. |
| Agreement (optional) | Title and text in Hebrew and English. Placeholders: `{{client_name}}`, `{{business_name}}`, `{{date}}`, `{{email}}`, `{{phone}}`, or any field key. A sample agreement can be inserted as a starting point. **It is not legal advice; have a lawyer review your wording.** |

With no configuration there is one built-in template (`/w/default`, also served at `/intake`) based on the active preset. Saving a template called `default` replaces it. The mortgage-advisor preset keeps its own 5-step wizard at `/intake`.

Saving templates and branding needs the **Postgres** backend (or demo mode locally). On Airtable, the built-in template is used and the editor is read-only.

## E-signature records

When a client signs, the server re-renders the agreement itself and stores:

- the exact title and text shown to the client,
- a SHA-256 fingerprint of that text,
- the drawn signature (PNG), signer name and time,
- IP address and browser.

Staff open it from the case page (*Client portal* tab → *View and print*); the browser's print dialog saves it as a PDF. Integrity check: the fingerprint equals `sha256(title + "\n\n" + body)`.

This fits most everyday service agreements. For regulated or high-value contracts, use a qualified e-signature provider.

On Airtable, the signature image isn't stored (no table for it); a line with the signer, time, fingerprint and IP is added to the case notes and activity log instead.

## Branding

In `/admin/onboarding` → *Branding*: business name (Hebrew and English), logo URL (https) and brand color. Client-facing pages (landing, onboarding, portal) use them. Without a database, set `BUSINESS_NAME`, `BUSINESS_NAME_HE`, `BUSINESS_LOGO_URL` and `BRAND_COLOR` in the environment.

## File storage

| Mode | When | Notes |
|---|---|---|
| Local disk (default) | Always available | Files go to `UPLOAD_DIR`. Fine for a VPS; **not** for Vercel or other serverless hosts, which lose files between requests. |
| Supabase Storage | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or the older `SUPABASE_SERVICE_ROLE_KEY`) and `SUPABASE_STORAGE_BUCKET` are set | Create a **private** bucket first. Downloads use short-lived signed URLs. |

Files are only downloadable by signed-in staff (`/api/files/<id>`) and are always served as attachments.

## Security notes

- Uploads require the client's signed personal link for *that* case, or a staff session.
- The personal link token holds only the case number and expiry, signed with `PORTAL_INVITE_SECRET`. **Set a long random secret in production.** Changing it invalidates all existing links.
- Submissions keep only fields defined in the template; anything else is dropped.
- Case, contract, reminder and file APIs are staff-only.
