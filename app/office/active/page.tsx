import { OfficePageClient } from '@/components/office-page';
import { hasAirtableConfig } from '@/lib/env';
import { filterCasesByBucket } from '@/lib/office-buckets';
import { listBankOffers, listCases } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export default async function OfficeActivePage() {
  const all = await listCases();
  const cases = filterCasesByBucket(all, 'active');
  const offersByCase = Object.fromEntries(
    await Promise.all(cases.map(async (item) => [item.id, await listBankOffers(item.id)])),
  ) as Record<string, Awaited<ReturnType<typeof listBankOffers>>>;

  return <OfficePageClient cases={cases} offersByCase={offersByCase} liveMode={hasAirtableConfig()} bucket="active" />;
}
