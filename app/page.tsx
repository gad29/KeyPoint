import { HomePageClient } from '@/components/home-page';
import { documentLibrary } from '@/data/domain';
import { hasAirtableConfig } from '@/lib/env';
import { listBankOffers, listCases } from '@/lib/repository';

export default async function HomePage() {
  const cases = await listCases();
  const activeCases = cases.length.toString();
  const reviewQueue = cases.filter((item) => item.stage === 'secretary-review' || item.stage === 'documents-in-progress' || item.stage === 'intake-submitted').length.toString();
  const offers = await Promise.all(cases.map((item) => listBankOffers(item.id)));
  const receivedOffers = offers.flat().filter((item) => item.status === 'received').length.toString();

  return (
    <HomePageClient
      activeCases={activeCases}
      reviewQueue={reviewQueue}
      receivedOffers={receivedOffers}
      documentCount={documentLibrary.length}
      liveMode={hasAirtableConfig()}
    />
  );
}
