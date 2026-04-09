'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n';

type LoginFormProps = {
  nextPath?: string;
  staffLoginAvailable: boolean;
  registerAllowed: boolean;
};

const copy = {
  en: {
    staffEyebrow: 'Staff',
    staffTitle: 'Sign in to the workspace',
    staffBody: 'Use your staff email and password. Clients cannot access this area.',
    email: 'Work email',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    signInError: 'Could not sign in',
    staffUnavailable: 'Staff sign-in needs Airtable configured and a Staff table with hashed passwords.',
    registerToggle: 'Create staff account (setup)',
    registerTitle: 'Register a staff user',
    registerBody: 'Requires the setup secret from your environment (STAFF_REGISTER_SECRET). Passwords are stored hashed in Airtable.',
    regName: 'Full name',
    regEmail: 'Email',
    regPassword: 'Password (min 10 characters)',
    regSecret: 'Setup secret',
    registerCta: 'Create account',
    registering: 'Creating…',
    registerOk: 'Account created. You can sign in now.',
    registerError: 'Registration failed',
  },
  he: {
    staffEyebrow: 'צוות',
    staffTitle: 'כניסה לסביבת העבודה',
    staffBody: 'התחברו עם אימייל וסיסמה של צוות. אזור זה אינו זמין ללקוחות.',
    email: 'אימייל עבודה',
    password: 'סיסמה',
    signIn: 'כניסה',
    signingIn: 'מתחבר…',
    signInError: 'הכניסה נכשלה',
    staffUnavailable: 'כניסת צוות דורשת חיבור ל־Airtable וטבלת Staff עם סיסמאות מוצפנות (האש).',
    registerToggle: 'יצירת משתמש צוות (הקמה)',
    registerTitle: 'רישום משתמש צוות',
    registerBody: 'נדרש סוד ההקמה מהסביבה (STAFF_REGISTER_SECRET). הסיסמאות נשמרות כהאש ב־Airtable.',
    regName: 'שם מלא',
    regEmail: 'אימייל',
    regPassword: 'סיסמה (לפחות 10 תווים)',
    regSecret: 'סוד הקמה',
    registerCta: 'יצירת חשבון',
    registering: 'יוצר…',
    registerOk: 'החשבון נוצר. אפשר להתחבר.',
    registerError: 'הרישום נכשל',
  },
};

export function LoginForm({ nextPath = '/office/active', staffLoginAvailable, registerAllowed }: LoginFormProps) {
  const { language, dir } = useI18n();
  const t = copy[language];
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSecret, setRegSecret] = useState('');
  const [regMessage, setRegMessage] = useState('');
  const [regError, setRegError] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  async function submitStaffLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStaffError('');
    if (!staffLoginAvailable) return;

    setStaffSubmitting(true);
    const res = await fetch('/api/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({ ok: false, error: t.signInError }));
    setStaffSubmitting(false);

    if (json.ok) {
      router.push(nextPath as never);
      router.refresh();
      return;
    }
    setStaffError(json.error || t.signInError);
  }

  async function submitRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegError('');
    setRegMessage('');
    setRegSubmitting(true);
    const res = await fetch('/api/auth/staff/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-keypoint-staff-register-secret': regSecret.trim(),
      },
      body: JSON.stringify({ email: regEmail, password: regPassword, fullName: regName }),
    });
    const json = await res.json().catch(() => ({ ok: false, error: t.registerError }));
    setRegSubmitting(false);
    if (json.ok) {
      setRegMessage(json.warning || t.registerOk);
      setRegPassword('');
      setRegSecret('');
      return;
    }
    setRegError(json.error || t.registerError);
  }

  return (
    <div className="login-staff-only" dir={dir}>
      <div className="card staff-login-card">
        <p className="eyebrow">{t.staffEyebrow}</p>
        <h2>{t.staffTitle}</h2>
        <p className="muted">{staffLoginAvailable ? t.staffBody : t.staffUnavailable}</p>

        {staffLoginAvailable ? (
          <form className="grid" style={{ gap: 14 }} onSubmit={submitStaffLogin}>
            <label className="field">
              <span>{t.email}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="field">
              <span>{t.password}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button className="button" type="submit" disabled={staffSubmitting}>
              {staffSubmitting ? t.signingIn : t.signIn}
            </button>
            {staffError ? (
              <p className="muted" style={{ color: '#f97066' }}>
                {staffError}
              </p>
            ) : null}
          </form>
        ) : null}

        {registerAllowed && staffLoginAvailable ? (
          <div className="login-register-zone">
            <button type="button" className="button button-textlike" onClick={() => setShowRegister((v) => !v)}>
              {showRegister ? '−' : '+'} {t.registerToggle}
            </button>
            {showRegister ? (
              <form className="grid nested-card" style={{ gap: 12, marginTop: 12, padding: 16 }} onSubmit={submitRegister}>
                <p className="eyebrow" style={{ margin: 0 }}>
                  {t.registerTitle}
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  {t.registerBody}
                </p>
                <label className="field">
                  <span>{t.regName}</span>
                  <input value={regName} onChange={(e) => setRegName(e.target.value)} />
                </label>
                <label className="field">
                  <span>{t.regEmail}</span>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                </label>
                <label className="field">
                  <span>{t.regPassword}</span>
                  <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required minLength={10} autoComplete="new-password" />
                </label>
                <label className="field">
                  <span>{t.regSecret}</span>
                  <input type="password" value={regSecret} onChange={(e) => setRegSecret(e.target.value)} required autoComplete="off" />
                </label>
                <button className="button button-secondary" type="submit" disabled={regSubmitting}>
                  {regSubmitting ? t.registering : t.registerCta}
                </button>
                {regMessage ? <p className="muted" style={{ color: '#7ee787' }}>{regMessage}</p> : null}
                {regError ? <p className="muted" style={{ color: '#f97066' }}>{regError}</p> : null}
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
