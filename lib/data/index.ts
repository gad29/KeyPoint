import { getDataBackend } from '@/lib/env';
import { airtableStore } from '@/lib/data/airtable-store';
import { demoStore } from '@/lib/data/demo-store';
import { postgresStore } from '@/lib/data/postgres-store';
import type { DataStore } from '@/lib/data/types';

export type * from '@/lib/data/types';

export function getStore(): DataStore {
  switch (getDataBackend()) {
    case 'postgres':
      return postgresStore;
    case 'airtable':
      return airtableStore;
    default:
      return demoStore;
  }
}
