import { LoginForm } from '@/components/forms/login-form';
import { canUseStaffLogin, hasStaffRegisterSecret } from '@/lib/env';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/office/active';

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
      <LoginForm nextPath={nextPath} staffLoginAvailable={canUseStaffLogin()} registerAllowed={hasStaffRegisterSecret()} />
    </div>
  );
}
