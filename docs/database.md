# Data backends

Agency OS stores cases, contacts, documents, staff and finance through one interface (`lib/data/types.ts` → `DataStore`). Three backends implement it; all are optional.

| Backend | When it's used | Good for |
|---|---|---|
| `postgres` | `DATABASE_URL` is set | Production. Supabase or any Postgres 14+ |
| `airtable` | Airtable keys set, no `DATABASE_URL` | Existing KeyPoint tenants |
| `demo` | Nothing configured | Trying the product locally. Writes `data/demo-db.json`. Not for production |

Force one with `DATA_BACKEND=postgres|airtable|demo`.

## Postgres locally (Docker)

```bash
npm run db:up
```

Then add this line to `.env.local`:

```bash
DATABASE_URL=postgres://agencyos:agencyos-local@localhost:5546/agencyos
```

Create the tables, then the agency and its first owner login:

```bash
npm run db:migrate
```

```bash
npm run db:bootstrap -- --email you@business.com --name "Your Name"
```

Without `--password`, bootstrap generates one and prints it once.

## Supabase

1. Create a project at supabase.com.
2. Project Settings → Database → **Connection string** → *Session pooler* (port 5432). Put it in `DATABASE_URL` (or `keypoint.settings.json` → `database.url`, then `npm run apply-settings`).
3. Run `npm run db:migrate` and `npm run db:bootstrap -- --email …` once from your machine.
4. Put the same `DATABASE_URL` in Vercel / your VPS env.

The transaction pooler (port 6543) also works; prepared statements are switched off automatically for it.

## Security model

- The server connects with the database owner role and scopes every query by `agency_id`.
- Row-level security is **enabled on every table with no policies**, so Supabase's public REST/GraphQL API (anon and authenticated keys) cannot read or write anything. Do not add permissive policies unless you also move queries to per-user auth.
- Never expose `DATABASE_URL` to the browser. It is only read server-side.

## Tenancy

One deployment serves one agency, chosen by `AGENCY_SLUG` (default `default`). The agency row is created on first use from `BUSINESS_NAME`, `AGENCY_OS_PRESET` and `BUSINESS_CURRENCY`. The schema is already multi-tenant; routing several agencies through one deployment (subdomains, sign-up) is a later phase.

## Migrations

SQL files live in `db/migrations/` and run in filename order. `npm run db:migrate` applies only new files, each in its own transaction, and records them in `schema_migrations`. To change the schema, add a new numbered file; never edit one that has already run.

## Moving existing Airtable data

There is no automatic import yet. Until one exists, keep `DATA_BACKEND=airtable` for tenants whose live data is in Airtable.
