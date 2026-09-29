import fs from 'node:fs';
import path from 'node:path';

/** Loads .env.local into process.env (without overriding existing values) for standalone scripts. */
export function loadLocalEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

export function requireDatabaseUrl() {
  loadLocalEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Add it to .env.local (or keypoint.settings.json → database.url) first.');
    process.exit(1);
  }
  return url;
}

export function sslOption(url) {
  return /supabase\.(co|com)|sslmode=require/.test(url) ? 'require' : false;
}
