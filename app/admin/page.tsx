import { redirect } from 'next/navigation';
import { AdminDashboardClient } from '@/components/admin-dashboard';
import { requireAdvisorFinanceAccess } from '@/lib/admin-auth';
import { listRecentFinanceTransactions, summarizeTransactions } from '@/lib/airtable-finance';

export default async function AdminPage() {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) {
    if (gate.status === 401) {
      redirect('/login?next=/admin');
    }
    redirect('/office/active');
  }

  const txs = await listRecentFinanceTransactions();
  const rows = txs.ok && txs.data ? txs.data : [];
  const summary = summarizeTransactions(rows);

  return <AdminDashboardClient initialSummary={summary} initialRows={rows} sessionEmail={gate.session.email} />;
}
