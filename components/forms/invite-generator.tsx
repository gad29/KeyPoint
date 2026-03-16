'use client';

import { useState } from 'react';

export function InviteGenerator({ caseId }: { caseId: string }) {
  const [link, setLink] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  async function handleCreate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to create invite');
      setLink(json.portalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">Portal invite</p>
      <button className="button" onClick={handleCreate} disabled={loading}>
        {loading ? 'Generating…' : 'Generate invite link'}
      </button>
      {link ? <p className="muted" style={{ marginTop: 12 }}>{link}</p> : null}
      {error ? <p style={{ color: '#ff8f8f' }}>{error}</p> : null}
    </div>
  );
}
