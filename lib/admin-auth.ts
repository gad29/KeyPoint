import { canAccessAdvisorFinanceDashboard } from '@/lib/staff-roles';
import { getCurrentStaffFromCookies, type StaffSessionPayload } from '@/lib/staff-session';

export async function requireAdvisorFinanceAccess(): Promise<
  { ok: true; session: StaffSessionPayload } | { ok: false; status: number; error: string }
> {
  const session = await getCurrentStaffFromCookies();
  if (!session) {
    return { ok: false, status: 401, error: 'Staff sign-in required' };
  }
  if (!canAccessAdvisorFinanceDashboard(session.role)) {
    return { ok: false, status: 403, error: 'Advisor or admin role required' };
  }
  return { ok: true, session };
}
