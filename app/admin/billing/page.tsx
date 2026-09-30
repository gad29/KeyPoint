import { redirect } from 'next/navigation';
import { requireAdvisorFinanceAccess } from '@/lib/admin-auth';
import { getBillingSettings } from '@/lib/billing/service';
import { billingStatus } from '@/lib/billing/status';
import { BillingSettingsForm } from '@/components/billing/billing-settings';

export const dynamic = 'force-dynamic';

export default async function AdminBillingPage() {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) redirect(gate.status === 401 ? '/login?next=/admin/billing' : '/office/active');
  return <BillingSettingsForm initial={await getBillingSettings()} status={billingStatus()} />;
}
