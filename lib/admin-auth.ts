import { canAccessAdvisorFinanceDashboard } from '@/lib/staff-roles';
import { getCurrentStaffFromCookies, type StaffSessionPayload } from '@/lib/staff-session';
import { getDataBackend, isProductionLike } from '@/lib/env';

export async function requireAdvisorFinanceAccess(): Promise<
  { ok: true; session: StaffSessionPayload } | { ok: false; status: number; error: string }
> {
  const session = await getCurrentStaffFromCookies();
  if (!session && getDataBackend() === 'demo' && !isProductionLike()) {
    // Local zero-config demo: there is no user store to sign in against.
    return {
      ok: true,
      session: { scope: 'staff', email: 'demo@localhost', recordId: 'demo', role: 'admin', expiresAt: new Date(Date.now() + 3_600_000).toISOString() },
    };
  }
  if (!session) {
    return { ok: false, status: 401, error: 'Staff sign-in required' };
  }
  if (!canAccessAdvisorFinanceDashboard(session.role)) {
    return { ok: false, status: 403, error: 'Advisor or admin role required' };
  }
  return { ok: true, session };
}
