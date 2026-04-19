import { NextResponse } from 'next/server';
import { canAccessAdvisorFinanceDashboard } from '@/lib/staff-roles';
import { getCurrentStaffFromCookies } from '@/lib/staff-session';

export async function GET() {
  const session = await getCurrentStaffFromCookies();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    email: session.email,
    role: session.role,
    canAccessAdminFinance: canAccessAdvisorFinanceDashboard(session.role),
  });
}
