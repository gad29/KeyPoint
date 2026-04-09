# KeyPoint deployment on a CloudPanel VPS

This guide is for deploying the app from GitHub onto another VPS that already has the domain and CloudPanel.

## Recommended production shape
- App: KeyPoint Next.js app
- Process manager: PM2
- Web entry: CloudPanel-managed domain + reverse proxy to local Node port
- Node version: 20 LTS
- App port: `3000`
- App root on server: `/home/<site-user>/htdocs/<domain>/current`

## Before you start
Make sure you have:
- the GitHub repo URL
- SSH access to the target VPS
- the CloudPanel site/domain already created or ready to create
- the real production values for Airtable, n8n, Twilio/email/webhooks, and `PORTAL_INVITE_SECRET`

## 1) Prepare the repo locally before pushing
From the app folder:

```bash
cd apps/keypoint
npm install
npm run build
```

Optional but recommended if you want generated env files from one settings file:

```bash
cp keypoint.settings.example.json keypoint.settings.json
# fill in real values
npm run apply-settings
```

Then push the app to GitHub.

## 2) Create the Node.js site in CloudPanel
In CloudPanel:
1. Add Site
2. Choose **Node.js**
3. Select the domain/subdomain already pointed at this VPS
4. Pick Node.js **20**
5. Set the app port to **3000**
6. Create the site
7. Install SSL/Let's Encrypt in CloudPanel for the domain

CloudPanel will create a site user and a site folder under `/home/<site-user>/htdocs/`.

## 3) SSH into the server as the site user
Either use the CloudPanel site user directly, or SSH in as root and switch to the site user.

Example:

```bash
sudo su - <site-user>
cd /home/<site-user>/htdocs/<domain>
```

## 4) Clone the GitHub repo into the site directory
A clean layout that is easy to redeploy:

```bash
mkdir -p /home/<site-user>/htdocs/<domain>/repo
cd /home/<site-user>/htdocs/<domain>/repo
git clone <YOUR_GITHUB_REPO_URL> .
cd apps/keypoint
```

If the repo is private, use whichever Git auth method you already trust on that VPS.

## 5) Install Node deps and create the production env
Install dependencies:

```bash
npm ci
```

Then create the production env file.

### Option A — direct env file
```bash
cp .env.production.example .env.production.local
nano .env.production.local
```

### Option B — generate env from one settings file
```bash
cp keypoint.settings.example.json keypoint.settings.json
nano keypoint.settings.json
npm run apply-settings
```

If you use Option B, the app will generate `.env.production.local` for you.

## 6) Minimum env values you must set
At minimum, set these correctly:

```env
APP_BASE_URL=https://your-real-domain.tld
KEYPOINT_APP_BASE_URL=https://your-real-domain.tld
PORTAL_INVITE_SECRET=<long-random-secret>
AIRTABLE_API_KEY=<your-airtable-key>
AIRTABLE_BASE_ID=<your-airtable-base-id>
N8N_WEBHOOK_BASE_URL=https://your-n8n-domain/webhook
UPLOAD_DIR=./data/uploads
UPLOAD_PUBLIC_BASE_URL=https://your-real-domain.tld/uploads
```

Also fill in the Airtable table names and whichever messaging/email/OCR/AI fields you actually use.

## 7) Build the app
```bash
npm run build
```

## 8) Start it with PM2
Install PM2 once for the site user if needed:

```bash
npm install -g pm2
```

Start the app:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

Useful log command:

```bash
pm2 logs keypoint --lines 100
```

## 9) Point CloudPanel/Nginx to the Node app
For a Node.js site, CloudPanel usually wires the domain to the chosen local port already. Confirm that the site is proxying to `127.0.0.1:3000`.

If you need to verify manually, the reverse proxy target should be:

```nginx
http://127.0.0.1:3000
```

And the forwarded headers should include at least:
- `Host`
- `X-Forwarded-For`
- `X-Forwarded-Proto`

If CloudPanel’s Node.js site type is working normally, you should not need to hand-edit Nginx.

## 10) Smoke test after deploy
Check these in the browser:
- `/`
- `/intake`
- `/office`
- `/portal`
- `/docs`

Check these via curl:

```bash
curl -I https://your-real-domain.tld/
# List cases requires an office session cookie when OFFICE_ACCESS_CODE is set (401 without it).
curl https://your-real-domain.tld/api/cases
```

## 11) Make uploads writable
Because uploads are local by default, make sure the directory exists and is writable by the site user:

```bash
mkdir -p data/uploads
chmod 755 data data/uploads
```

Important: local VPS storage is better than Vercel ephemeral storage, but it is still only on that one server. If uploads matter, back them up or move them to durable object/storage later.

## 12) Updating the app later
On the server:

```bash
cd /home/<site-user>/htdocs/<domain>/repo
git pull
cd apps/keypoint
npm ci
npm run build
pm2 restart keypoint
pm2 status
```

## 13) Common problems

### App builds but site shows 502/Bad Gateway
- check `pm2 status`
- check `pm2 logs keypoint --lines 100`
- confirm CloudPanel is proxying to port `3000`
- confirm the app is listening on `0.0.0.0:3000`

### App starts but Airtable data does not load
- re-check `AIRTABLE_API_KEY`
- re-check `AIRTABLE_BASE_ID`
- confirm the table names match `docs/airtable-schema.md`

### Invite links fail
- verify `PORTAL_INVITE_SECRET`
- verify `APP_BASE_URL` matches the live domain exactly

### Uploads fail
- verify `UPLOAD_DIR`
- verify `data/uploads` exists and is writable
- verify any n8n upload webhook path configured in env

## 14) Recommended first live test
1. Open the public intake form
2. Submit one real test case
3. Confirm a case row appears in Airtable
4. Confirm client/document/activity rows are created
5. Confirm `/office` reflects the new case
6. Test invite generation
7. Test one upload
8. Confirm n8n receives the upload event

## Deployment summary
The safe production loop is:
1. push repo to GitHub
2. clone repo onto the CloudPanel VPS
3. create `.env.production.local`
4. `npm ci`
5. `npm run build`
6. `pm2 start ecosystem.config.cjs`
7. verify CloudPanel domain + SSL + proxy
