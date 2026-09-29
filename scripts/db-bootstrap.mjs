#!/usr/bin/env node
// Usage: npm run db:bootstrap -- --email you@biz.com [--password ...] [--name "Full Name"]
//        [--agency-name "My Studio"] [--preset default|mortgage-advisor]
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { requireDatabaseUrl, sslOption } from './db-env.mjs';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const email = arg('email')?.trim().toLowerCase();
if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Pass a valid --email for the owner account.');
  process.exit(1);
}

const url = requireDatabaseUrl();
const slug = (process.env.AGENCY_SLUG || 'default').trim().toLowerCase();
const agencyName = arg('agency-name') || process.env.BUSINESS_NAME || 'My business';
const preset = arg('preset') || process.env.AGENCY_OS_PRESET || 'default';
const generated = !arg('password');
const password = arg('password') || crypto.randomBytes(12).toString('base64url');

if (password.length < 10) {
  console.error('Password must be at least 10 characters.');
  process.exit(1);
}

const sql = postgres(url, { ssl: sslOption(url), max: 1, onnotice: () => {} });

try {
  const [agency] = await sql`
    insert into agencies (slug, name, name_he, preset, currency)
    values (${slug}, ${agencyName}, ${process.env.BUSINESS_NAME_HE || null}, ${preset}, ${process.env.BUSINESS_CURRENCY || 'ILS'})
    on conflict (slug) do update set name = excluded.name, preset = excluded.preset
    returning id, slug`;

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await sql`
    insert into users (agency_id, email, password_hash, full_name, role)
    values (${agency.id}, ${email}, ${passwordHash}, ${arg('name') || null}, 'admin')
    on conflict (agency_id, lower(email)) do update set password_hash = excluded.password_hash, active = true
    returning id`;

  console.log(`Agency "${agency.slug}" ready. Owner ${email} (user ${user.id}).`);
  if (generated) console.log(`Generated password (shown once): ${password}`);
} catch (error) {
  console.error('Bootstrap failed:', error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
