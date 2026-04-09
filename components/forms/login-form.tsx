'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [token, setToken] = useState('');
  const router = useRouter();

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

      <section className="card">
        <p className="eyebrow">Office</p>
        <h2>Office workspace</h2>
        <p className="muted">Open the internal case workspace for secretary and advisor actions.</p>
        <a className="button button-secondary" href="/office">Enter office</a>
      </section>
    </div>
  );
}
