'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [token, setToken] = useState('');
  const router = useRouter();

  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); if (token.trim()) router.push(`/invite/${token.trim()}`); }}>
      <p className="eyebrow">Client access</p>
      <h2>Open your invite link</h2>
      <label className="field">
        <span>Invite token</span>
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token" />
      </label>
      <button className="button" type="submit">Continue</button>
    </form>
  );
}
