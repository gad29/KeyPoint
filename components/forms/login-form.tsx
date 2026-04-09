'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type LoginFormProps = {
  officeAuthEnabled: boolean;
  nextPath?: string;
};

export function LoginForm({ officeAuthEnabled, nextPath = '/office/active' }: LoginFormProps) {
  const [token, setToken] = useState('');
  const [officeCode, setOfficeCode] = useState('');
  const [officeError, setOfficeError] = useState('');
  const [submittingOffice, setSubmittingOffice] = useState(false);
  const router = useRouter();

  async function submitOfficeLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOfficeError('');

    if (!officeAuthEnabled) {
      router.push(nextPath as never);
      return;
    }

    setSubmittingOffice(true);
    const res = await fetch('/api/office/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: officeCode }),
    });
    const json = await res.json().catch(() => ({ ok: false, error: 'Login failed' }));
    setSubmittingOffice(false);

    if (json.ok) {
      router.push(nextPath as never);
      router.refresh();
      return;
    }

    setOfficeError(json.error || 'Login failed');
  }

  return (
    <div className="grid">
      <form className="card" onSubmit={(e) => { e.preventDefault(); if (token.trim()) router.push(`/progress/${token.trim()}` as never); }}>
        <p className="eyebrow">Client progress</p>
        <h2>Open your progress link</h2>
        <label className="field">
          <span>Progress token</span>
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token" />
        </label>
        <button className="button" type="submit">Continue</button>
      </form>

      <form className="card" onSubmit={submitOfficeLogin}>
        <p className="eyebrow">Office</p>
        <h2>Office workspace</h2>
        <p className="muted">
          {officeAuthEnabled
            ? 'Enter the internal office access code to open the secretary and advisor workspace.'
            : 'Office auth is not configured yet on this environment. Continuing will open the internal workspace directly.'}
        </p>
        {officeAuthEnabled ? (
          <label className="field">
            <span>Office access code</span>
            <input type="password" value={officeCode} onChange={(e) => setOfficeCode(e.target.value)} placeholder="Enter office code" />
          </label>
        ) : null}
        <button className="button button-secondary" type="submit" disabled={submittingOffice}>
          {submittingOffice ? 'Checking…' : 'Enter office'}
        </button>
        {officeError ? <p className="muted" style={{ color: '#b42318' }}>{officeError}</p> : null}
      </form>
    </div>
  );
}
