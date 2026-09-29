import { notFound } from 'next/navigation';
import { getCase, listBankOffers, getCaseChecklist } from '@/lib/repository';
import { CaseDetailPage } from '@/components/case-detail-page';
import { getActivePreset } from '@/lib/presets';

export const dynamic = 'force-dynamic';

export default async function CaseDetailServerPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const preset = getActivePreset();

  const [caseRecord, offers, checklist] = await Promise.all([
    getCase(caseId),
    preset.features.bankOffers ? listBankOffers(caseId) : Promise.resolve([]),
    getCaseChecklist(caseId),
  ]);

  if (!caseRecord) notFound();

  return (
    <CaseDetailPage
      caseRecord={caseRecord}
      initialOffers={offers}
      checklist={checklist}
      presetId={preset.id}
      presetFeatures={preset.features}
    />
  );
}
