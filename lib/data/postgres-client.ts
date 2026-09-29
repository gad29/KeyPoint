import postgres from 'postgres';
import { env } from '@/lib/env';

type Sql = ReturnType<typeof postgres>;

const globalForSql = globalThis as unknown as { agencyOsSql?: Sql };

export function getSql(): Sql {
  if (!env.databaseUrl) throw new Error('DATABASE_URL is not configured');
  if (!globalForSql.agencyOsSql) {
    const url = env.databaseUrl;
    globalForSql.agencyOsSql = postgres(url, {
      ssl: /supabase\.(co|com)|sslmode=require/.test(url) ? 'require' : false,
      max: Number(process.env.DATABASE_POOL_MAX || 5),
      idle_timeout: 20,
      // Supabase's transaction pooler (port 6543) does not support prepared statements.
      prepare: !url.includes(':6543'),
      onnotice: () => {},
    });
  }
  return globalForSql.agencyOsSql;
}
