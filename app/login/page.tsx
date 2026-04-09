import { LoginForm } from '@/components/forms/login-form';
import { hasOfficeAuthConfig } from '@/lib/env';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/office/active';

  return (
    <div className="grid" style={{ maxWidth: 560 }}>
      <LoginForm officeAuthEnabled={hasOfficeAuthConfig()} nextPath={nextPath} />
    </div>
  );
}
