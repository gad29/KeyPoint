import { NextResponse } from 'next/server';
import { listReminderQueue } from '@/lib/billing/service';

/** Staff-only (middleware): reminders waiting for approval. */
export async function GET() {
  return NextResponse.json({ ok: true, data: await listReminderQueue() });
}
