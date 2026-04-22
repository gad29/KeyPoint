import { notFound } from 'next/navigation';
import { getCase, listBankOffers, getCaseChecklist } from '@/lib/repository';
import { CaseDetailPage } from '@/components/case-detail-page';

export const dynamic = 'force-dynamic';

export default async function CaseDetailServerPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const [caseRecord, offers, checklist] = await Promise.all([
    getCase(caseId),
    listBankOffers(caseId),
    getCaseChecklist(caseId),
  ]);

  if (!caseRecord) notFound();

  return (
    <CaseDetailPage
      caseRecord={caseRecord}
      initialOffers={offers}
      checklist={checklist}
    />
  );
}
