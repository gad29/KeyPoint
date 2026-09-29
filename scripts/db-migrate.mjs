#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { requireDatabaseUrl, sslOption } from './db-env.mjs';

const url = requireDatabaseUrl();
const sql = postgres(url, { ssl: sslOption(url), max: 1, onnotice: () => {} });
const dir = path.join(process.cwd(), 'db', 'migrations');

try {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql`select name from schema_migrations`).map((row) => row.name));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const body = fs.readFileSync(path.join(dir, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`applied ${file}`);
    ran += 1;
  }
  console.log(ran ? `${ran} migration(s) applied.` : 'Database is up to date.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
