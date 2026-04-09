# KeyPoint live deployment checklist for keypoint.work

This is the practical checklist for deploying the real KeyPoint app from this repo to the live VPS behind `keypoint.work`.

## Known current reality
- App repo: `https://github.com/JadeGadClaw/KeyPoint`
- App path in this workspace: `apps/keypoint`
- Real production domain: `keypoint.work`
- Earlier notes showed a DNS mismatch during development:
  - `keypoint.work` was resolving to `212.47.64.204`
  - the active build workspace here was on `72.61.195.165`
- So before treating anything as live, confirm which VPS is actually supposed to serve `keypoint.work`.

---

## A. Decide the target host first
- [ ] Confirm the production VPS IP that should serve `keypoint.work`
- [ ] If `212.47.64.204` is the real production server, deploy there
- [ ] If the intended production server is different, update DNS before go-live
- [ ] Verify both:
  - [ ] `keypoint.work`
  - [ ] `www.keypoint.work`
- [ ] Make sure SSL/Let's Encrypt is active for the final domain

Quick checks:
```bash
dig +short keypoint.work
dig +short www.keypoint.work
curl -I https://keypoint.work
```

---

## B. Push the clean app state to GitHub
From the repo root on this machine:

```bash
cd /srv/gad-share/apps/keypoint
git status
npm run build
```

Then commit and push:

```bash
git add .
git commit -m "Prepare KeyPoint for VPS deployment"
git push origin main
```

What this deployment prep includes:
- VPS/CloudPanel deployment guide
- PM2 ecosystem file
- Node version pin via `.nvmrc`
- standalone Next.js output enabled
- production env example expanded
- upload dir ignored safely except for `.gitkeep`

---

## C. Prepare the target VPS
- [ ] CloudPanel Node.js site exists for `keypoint.work`
- [ ] Node.js version is set to 20
- [ ] App port is set to 3000
- [ ] Reverse proxy points to `127.0.0.1:3000`
- [ ] Site user has SSH access
- [ ] Git access for private repo works on the server

Recommended layout on server:
```bash
/home/<site-user>/htdocs/keypoint.work/repo
```

---

## D. Clone/update the repo on the real VPS
```bash
sudo su - <site-user>
mkdir -p /home/<site-user>/htdocs/keypoint.work/repo
cd /home/<site-user>/htdocs/keypoint.work/repo
git clone https://github.com/JadeGadClaw/KeyPoint.git .
cd apps/keypoint
```

For updates later:
```bash
cd /home/<site-user>/htdocs/keypoint.work/repo
git pull
cd apps/keypoint
```

---

## E. Production env file for keypoint.work
Create:
```bash
cd /home/<site-user>/htdocs/keypoint.work/repo/apps/keypoint
cp .env.production.example .env.production.local
nano .env.production.local
```

Minimum live values that must match production:
```env
APP_BASE_URL=https://keypoint.work
KEYPOINT_APP_BASE_URL=https://keypoint.work
PORTAL_INVITE_SECRET=<long-random-secret>
AIRTABLE_API_KEY=<real-value>
AIRTABLE_BASE_ID=<real-value>
N8N_WEBHOOK_BASE_URL=<real-value>
UPLOAD_DIR=./data/uploads
UPLOAD_PUBLIC_BASE_URL=https://keypoint.work/uploads
```

Also fill whichever of these are genuinely in use:
- Airtable table names
- Office alert webhook
- WhatsApp/SMS/email provider webhooks
- OCR webhook
- AI review webhook
- Twilio values
- Email values
- Google Drive / Sheets values

Important:
- do **not** paste the real secrets into git
- do **not** commit `.env.production.local`
- keep `PORTAL_INVITE_SECRET` long and random

---

## F. Build and run on the VPS
```bash
cd /home/<site-user>/htdocs/keypoint.work/repo/apps/keypoint
npm ci
npm run build
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

Useful logs:
```bash
pm2 logs keypoint --lines 100
```

---

## G. Make uploads work
Because uploads are still local-by-default:

```bash
mkdir -p data/uploads
chmod 755 data data/uploads
```

Checklist:
- [ ] upload directory exists
- [ ] upload directory is writable by the site user
- [ ] `/uploads` public URL path behaves as expected in production
- [ ] backup plan exists if uploaded files matter

---

## H. Live smoke test for keypoint.work
Browser checks:
- [ ] `https://keypoint.work/`
- [ ] `https://keypoint.work/intake`
- [ ] `https://keypoint.work/office`
- [ ] `https://keypoint.work/portal`
- [ ] `https://keypoint.work/docs`

HTTP checks:
```bash
curl -I https://keypoint.work/
# /api/cases expects 401 without office cookie when OFFICE_ACCESS_CODE is enabled.
curl https://keypoint.work/api/cases
```

Functional checks:
- [ ] submit one real test intake
- [ ] case row appears in Airtable
- [ ] primary client row appears
- [ ] optional co-applicant row appears if used
- [ ] document checklist rows are created
- [ ] activity log row is created
- [ ] `/office` shows the new case
- [ ] invite generation works
- [ ] invite link opens correctly
- [ ] one file upload works
- [ ] upload event reaches n8n

---

## I. Go-live risk list
Before calling it done:
- [ ] domain points at the actual deployed VPS
- [ ] SSL is valid
- [ ] PM2 survives restart
- [ ] local uploads are backed up or accepted as single-server storage
- [ ] Airtable base/table names match production reality
- [ ] n8n webhook base URL is the live one, not a placeholder
- [ ] no placeholder/example domains remain in the env file
- [ ] no secrets were committed to git

---

## J. Recommended exact rollout order
1. Confirm DNS target
2. Push clean repo to GitHub
3. Clone/pull on the real VPS
4. Create `.env.production.local`
5. `npm ci`
6. `npm run build`
7. `pm2 start ecosystem.config.cjs`
8. Verify CloudPanel proxy + SSL
9. Run the live smoke test
10. Submit one end-to-end test case
