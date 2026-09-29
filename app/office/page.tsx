import { listCases } from '@/lib/repository';
import { OfficeDashboard } from '@/components/office-dashboard';

export const dynamic = 'force-dynamic';

export default async function OfficeHomePage() {
  const cases = await listCases();
  return <OfficeDashboard cases={cases} />;
}
