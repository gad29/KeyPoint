import { NextResponse } from 'next/server';
import { listCases } from '@/lib/repository';
import { hasAirtableConfig } from '@/lib/env';

export async function GET() {
  const cases = await listCases();

  return NextResponse.json({
    ok: true,
    source: hasAirtableConfig() ? 'airtable-or-fallback' : 'local-sample',
    data: cases,
  });
}
