import { NextRequest, NextResponse } from 'next/server';
import { authorizeN8nForwarder } from '@/lib/n8n-forwarder-auth';
import { triggerN8n } from '@/lib/n8n';

export async function POST(req: NextRequest) {
  const auth = await authorizeN8nForwarder(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const workflow = (body as { workflow?: string })?.workflow;
  const payload = (body as { payload?: unknown })?.payload;

  if (!workflow || typeof workflow !== 'string') {
    return NextResponse.json({ ok: false, error: 'workflow is required' }, { status: 400 });
  }

  const result = await triggerN8n(workflow, payload ?? {});
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
