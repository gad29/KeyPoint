import { sampleOffers } from '@/data/domain';
import { OfficePageClient } from '@/components/office-page';
import { listCases } from '@/lib/repository';
import { hasAirtableConfig } from '@/lib/env';

export default async function OfficePage() {
  const cases = await listCases();
  const primaryCaseId = cases[0]?.id;

  return (
    <OfficePageClient
      cases={cases}
      sampleOffers={sampleOffers}
      primaryCaseId={primaryCaseId}
      liveMode={hasAirtableConfig()}
    />
  );
}
