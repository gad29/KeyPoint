'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n';

const copy = {
  en: {
    eyebrow: 'Client portal',
    button: 'Create portal link',
    loading: 'Creating…',
    fail: 'Failed to create invite',
    unknown: 'Unknown error',
  },
  he: {
    eyebrow: 'אזור לקוחות',
    button: 'יצירת קישור ללקוח',
    loading: 'יוצר קישור…',
    fail: 'לא ניתן היה ליצור קישור',
    unknown: 'שגיאה לא ידועה',
  },
};

export function InviteGenerator({ caseId }: { caseId: string }) {
  const { language } = useI18n();
  const t = copy[language];
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
      if (!json.ok) throw new Error(json.error || t.fail);
      setLink(json.portalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.unknown);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">{t.eyebrow}</p>
      <button className="button" onClick={handleCreate} disabled={loading}>
        {loading ? t.loading : t.button}
      </button>
      {link ? <p className="muted" style={{ marginTop: 12 }}>{link}</p> : null}
      {error ? <p style={{ color: '#ff8f8f' }}>{error}</p> : null}
    </div>
  );
}
