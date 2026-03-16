import { NextRequest, NextResponse } from 'next/server';
import { triggerN8n } from '@/lib/n8n';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const workflow = body?.workflow as string | undefined;
  const payload = body?.payload;

  if (!workflow) {
    return NextResponse.json({ ok: false, error: 'workflow is required' }, { status: 400 });
  }

  const result = await triggerN8n(workflow, payload ?? {});
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
