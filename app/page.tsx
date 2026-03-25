import { HomePageClient } from '@/components/home-page';
import { documentLibrary, sampleOffers } from '@/data/domain';
import { listCases } from '@/lib/repository';
import { hasAirtableConfig } from '@/lib/env';

export default async function HomePage() {
  const cases = await listCases();
  const activeCases = cases.length.toString();
  const reviewQueue = cases.filter((item) => item.stage === 'secretary-review' || item.stage === 'documents-in-progress').length.toString();
  const receivedOffers = sampleOffers.filter((item) => item.status === 'received').length.toString();

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
