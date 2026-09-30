import { getStore } from '@/lib/data';
import { billingStatus } from '@/lib/billing/status';
import { getBillingSettings, listReminderQueue } from '@/lib/billing/service';
import { BillingDashboard } from '@/components/billing/billing-dashboard';

export const dynamic = 'force-dynamic';

export default async function OfficeBillingPage() {
  const [invoices, queue, settings] = await Promise.all([getStore().listInvoices(), listReminderQueue(), getBillingSettings()]);
  const status = billingStatus();
  return (
    <BillingDashboard
      initialInvoices={invoices.data ?? []}
      initialQueue={queue}
      storageReady={status.storageReady}
      emailReady={status.email}
      aiReady={status.ai && settings.aiDrafts}
      autoSend={settings.autoSend}
      cronReady={status.cron}
    />
  );
}
