import { listCases } from '@/lib/repository';
import { OfficeDashboard } from '@/components/office-dashboard';

export default async function OfficeHomePage() {
  const cases = await listCases();
  return <OfficeDashboard cases={cases} />;
}
