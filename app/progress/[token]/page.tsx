import { notFound } from 'next/navigation';
import { PortalPageClient } from '@/components/portal-page';
import { getCase, getCaseChecklist, getInvite, listBankOffers } from '@/lib/repository';

export default async function ProgressPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInvite(token);
  if (!invite) return notFound();

  const caseRecord = await getCase(invite.caseId);
  if (!caseRecord) return notFound();

  const [requiredDocuments, offers] = await Promise.all([
    getCaseChecklist(invite.caseId),
    listBankOffers(invite.caseId),
  ]);

  return <PortalPageClient caseRecord={caseRecord} requiredDocuments={requiredDocuments} offers={offers} />;
}
