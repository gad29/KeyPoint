import { NextResponse } from 'next/server';
import { listCases } from '@/lib/repository';
import { listAirtableCases } from '@/lib/airtable';

export async function GET() {
  const localCases = await listCases();
  const airtable = await listAirtableCases();

  return NextResponse.json({
    ok: true,
    source: airtable.ok ? 'airtable+local' : 'local',
    airtable,
    data: localCases,
  });
}
