import { env, hasAirtableConfig } from '@/lib/env';

const apiBase = 'https://api.airtable.com/v0';

async function airtableRequest(table: string, init?: RequestInit) {
  if (!hasAirtableConfig()) {
    return { ok: false, error: 'Airtable is not configured' } as const;
  }

  const res = await fetch(`${apiBase}/${env.airtableBaseId}/${encodeURIComponent(table)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.airtableApiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    return { ok: false, error: `Airtable request failed with ${res.status}` } as const;
  }

  const json = await res.json();
  return { ok: true, data: json } as const;
}

export async function listAirtableCases() {
  return airtableRequest(env.airtableCasesTable);
}

export async function createAirtableCase(fields: Record<string, unknown>) {
  return airtableRequest(env.airtableCasesTable, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
}
