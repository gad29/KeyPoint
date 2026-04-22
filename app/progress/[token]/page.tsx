import { notFound } from 'next/navigation';
import { PortalPageClient } from '@/components/portal-page';
import { getCase, getCaseChecklist, getInvite, listBankOffers, listCaseDocuments } from '@/lib/repository';
import { env } from '@/lib/env';

export default async function ProgressPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInvite(token);
  if (!invite) return notFound();

  const caseRecord = await getCase(invite.caseId);
  if (!caseRecord) return notFound();

  const [requiredDocuments, offers, docRecords] = await Promise.all([
    getCaseChecklist(invite.caseId),
    listBankOffers(invite.caseId),
    listCaseDocuments(invite.caseId),
  ]);

  const docStatuses: Record<string, string> = {};
  for (const d of docRecords) {
    docStatuses[d.documentCode] = d.status;
  }

  return (
    <PortalPageClient
      caseRecord={caseRecord}
      requiredDocuments={requiredDocuments}
      offers={offers}
      docStatuses={docStatuses}
      secretaryWhatsapp={env.secretaryWhatsapp}
    />
  );
}
