import { PortalPageClient } from '@/components/portal-page';
import { listCases, getCaseChecklist } from '@/lib/repository';

export default async function PortalPage() {
  const cases = await listCases();
  const caseRecord = cases[0];
  const requiredDocuments = caseRecord ? (await getCaseChecklist(caseRecord.id)).filter((doc) => doc.required) : [];

  return <PortalPageClient caseRecord={caseRecord} requiredDocuments={requiredDocuments} />;
}
