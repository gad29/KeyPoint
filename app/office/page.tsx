import { OfficePageClient } from '@/components/office-page';
import { hasAirtableConfig } from '@/lib/env';
import { listBankOffers, listCases } from '@/lib/repository';

export default async function OfficePage() {
  const cases = await listCases();
  const offersByCase = Object.fromEntries(
    await Promise.all(cases.map(async (item) => [item.id, await listBankOffers(item.id)])),
  ) as Record<string, Awaited<ReturnType<typeof listBankOffers>>>;

  return <OfficePageClient cases={cases} offersByCase={offersByCase} liveMode={hasAirtableConfig()} />;
}
