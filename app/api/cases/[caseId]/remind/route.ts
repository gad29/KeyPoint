import { NextRequest, NextResponse } from 'next/server';
import { getCase, getCaseChecklist, issueClientLink, listCaseDocuments } from '@/lib/repository';
import { getStore } from '@/lib/data';
import { getBranding } from '@/lib/onboarding';
import { buildMissingDocsMessage, whatsappNumber } from '@/lib/onboarding/reminders';
import { triggerN8n } from '@/lib/n8n';
import { hasN8nConfig } from '@/lib/env';

const MISSING_STATUSES = new Set(['not-uploaded', 'resubmit-needed']);

/**
 * Staff-only (middleware). Prepares a missing-documents reminder with a fresh client link.
 * With { send: true } it is also forwarded to n8n for email/WhatsApp delivery.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  let body: { language?: string; send?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {}

  const caseRecord = await getCase(caseId);
  if (!caseRecord) return NextResponse.json({ ok: false, error: 'Case not found' }, { status: 404 });

  const language = body.language === 'en' ? 'en' : 'he';
  const [checklist, rows, branding] = await Promise.all([getCaseChecklist(caseId), listCaseDocuments(caseId), getBranding()]);
  const statuses = new Map(rows.map((r) => [r.documentCode, r.status]));
  const missing = checklist
    .filter((doc) => doc.required && MISSING_STATUSES.has(statuses.get(doc.code) ?? 'not-uploaded'))
    .map((doc) => (language === 'he' ? doc.labelHe : doc.labelEn));

  if (!missing.length) {
    return NextResponse.json({ ok: true, data: { missing: [], message: '', canSend: false } });
  }

  const link = issueClientLink(caseRecord).url;
  const message = buildMissingDocsMessage({
    clientName: caseRecord.leadName,
    businessName: language === 'he' ? branding.nameHe : branding.name,
    missing,
    link,
    language,
  });
  const wa = caseRecord.phone ? whatsappNumber(caseRecord.phone) : null;

  let sent = false;
  let sendError: string | undefined;
  if (body.send) {
    if (!hasN8nConfig()) {
      sendError = 'Automatic sending needs n8n (N8N_WEBHOOK_BASE_URL). Use WhatsApp or copy instead.';
    } else {
      const result = await triggerN8n('agency-os/missing-docs-reminder', {
        caseId,
        clientName: caseRecord.leadName,
        phone: caseRecord.phone,
        email: caseRecord.email || '',
        language,
        missing,
        portalUrl: link,
        message,
      });
      sent = result.ok;
      if (!result.ok) sendError = result.error;
    }
    await getStore().logActivity(caseId, 'missing-docs-reminder', sent ? `Reminder sent (${missing.length} missing)` : `Reminder send failed: ${sendError}`);
  }

  return NextResponse.json({
    ok: true,
    data: {
      missing,
      message,
      whatsappUrl: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(message)}` : null,
      canSend: hasN8nConfig(),
      sent,
      sendError,
    },
  });
}
