import { redirect } from 'next/navigation';
import { getCurrentStaffFromCookies } from '@/lib/staff-session';
import { AccountPage } from '@/components/account-page';

export default async function OfficeAccountPage() {
  const session = await getCurrentStaffFromCookies();
  if (!session) {
    redirect('/login?next=/office/account');
  }
  return <AccountPage email={session.email} role={session.role} />;
}
