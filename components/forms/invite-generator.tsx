'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n';

const copy = {
  en: {
    eyebrow: 'Client progress link',
    button: 'Create progress link',
    loading: 'Creating…',
    fail: 'Failed to create link',
    unknown: 'Unknown error',
    ready: 'Read-only link ready',
  },
  he: {
    eyebrow: 'קישור התקדמות ללקוח',
    button: 'יצירת קישור התקדמות',
    loading: 'יוצר קישור…',
    fail: 'לא ניתן היה ליצור קישור',
    unknown: 'שגיאה לא ידועה',
    ready: 'קישור צפייה מוכן',
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
      {link ? <div style={{ marginTop: 12 }}><strong>{t.ready}</strong><p className="muted" style={{ marginTop: 8 }}>{link}</p></div> : null}
      {error ? <p style={{ color: '#ff8f8f' }}>{error}</p> : null}
    </div>
  );
}
