import { redirect } from 'next/navigation';
import { requireAdvisorFinanceAccess } from '@/lib/admin-auth';
import { getDataBackend } from '@/lib/env';
import { getBranding, listAvailableTemplates } from '@/lib/onboarding';
import { OnboardingAdmin } from '@/components/onboarding/onboarding-admin';

export const dynamic = 'force-dynamic';

export default async function AdminOnboardingPage() {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) redirect(gate.status === 401 ? '/login?next=/admin/onboarding' : '/office/active');

  const [templates, branding] = await Promise.all([listAvailableTemplates(), getBranding()]);
  return <OnboardingAdmin initialTemplates={templates} initialBranding={branding} canSave={getDataBackend() !== 'airtable'} />;
}
