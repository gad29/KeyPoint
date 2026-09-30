import { env } from '@/lib/env';
import { getSql } from '@/lib/data/postgres-client';
import type { ActionResult } from '@/lib/types';

export type Row = Record<string, unknown>;

let agencyIdPromise: Promise<string> | null = null;

/** Resolves (and on first use creates) the agency row this deployment serves. */
export function getAgencyId(): Promise<string> {
  if (!agencyIdPromise) {
    agencyIdPromise = (async () => {
      const sql = getSql();
      await sql`
        insert into agencies (slug, name, name_he, preset, currency)
        values (${env.agencySlug}, ${env.businessName || 'My business'}, ${env.businessNameHe || null}, ${env.preset}, ${env.currency})
        on conflict (slug) do nothing`;
      const [row] = await sql`select id from agencies where slug = ${env.agencySlug}`;
      return String(row.id);
    })().catch((error) => {
      agencyIdPromise = null;
      throw error;
    });
  }
  return agencyIdPromise;
}

export function fail<T>(error: unknown, fallback: string): ActionResult<T> {
  const message = error instanceof Error ? error.message : fallback;
  console.error(`[AgencyOS Postgres] ${fallback}: ${message}`);
  return { ok: false, error: fallback };
}

export function iso(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' && value ? value : undefined;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type JsonParam = Parameters<ReturnType<typeof getSql>['json']>[0];

/** jsonb parameter. Passing JSON.stringify output instead makes the driver encode it twice. */
export function jsonb(value: unknown) {
  return value === undefined || value === null ? null : getSql().json(value as JsonParam);
}

export async function caseUuid(caseId: string): Promise<string | null> {
  const sql = getSql();
  const agencyId = await getAgencyId();
  const [row] = await sql`select id from cases where agency_id = ${agencyId} and case_number = ${caseId}`;
  return row ? String(row.id) : null;
}
