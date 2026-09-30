'use client';

import { useState } from 'react';

type Prepared = {
  missing: string[];
  message: string;
  whatsappUrl: string | null;
  canSend: boolean;
  sent?: boolean;
  sendError?: string;
};

/** One-click "these documents are still missing" reminder: WhatsApp, copy, or automatic send via n8n. */
export function MissingDocsReminder({ caseId, hasMissing }: { caseId: string; hasMissing: boolean }) {
  const [language, setLanguage] = useState<'he' | 'en'>('he');
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function call(send: boolean, lang = language) {
    setBusy(true);
    setNote('');
    try {
      const res = await fetch(`/api/cases/${caseId}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, send }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; data?: Prepared };
      if (!json.ok || !json.data) {
        setNote(json.error || 'שגיאה');
        return;
      }
      setPrepared(json.data);
      if (!json.data.missing.length) setNote('אין מסמכי חובה חסרים — אין צורך בתזכורת.');
      else if (send) setNote(json.data.sent ? 'התזכורת נשלחה ✓' : json.data.sendError || 'השליחה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card reminder-card">
      <div className="reminder-head">
        <div>
          <p className="eyebrow">תזכורת ללקוח</p>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {hasMissing ? 'הכנת הודעה עם רשימת המסמכים החסרים וקישור אישי להעלאה.' : 'כרגע אין מסמכי חובה חסרים.'}
          </p>
        </div>
        <div className="inline-actions">
          <select
            aria-label="שפת ההודעה"
            value={language}
            onChange={(e) => {
              const lang = e.target.value as 'he' | 'en';
              setLanguage(lang);
              if (prepared) void call(false, lang);
            }}
          >
            <option value="he">עברית</option>
            <option value="en">English</option>
          </select>
          <button type="button" className="button button-compact" disabled={busy || !hasMissing} onClick={() => call(false)}>
            {busy ? 'מכין…' : 'הכנת תזכורת'}
          </button>
        </div>
      </div>

      {prepared?.message ? (
        <div className="reminder-body">
          <textarea readOnly value={prepared.message} rows={Math.min(12, prepared.message.split('\n').length + 1)} dir="auto" />
          <div className="inline-actions">
            {prepared.whatsappUrl ? (
              <a className="button button-compact" href={prepared.whatsappUrl} target="_blank" rel="noopener noreferrer">
                שליחה בווטסאפ
              </a>
            ) : null}
            <button
              type="button"
              className="button button-secondary button-compact"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(prepared.message);
                  setNote('ההודעה הועתקה');
                } catch {
                  setNote('לא ניתן להעתיק — סמנו את הטקסט והעתיקו ידנית');
                }
              }}
            >
              העתקה
            </button>
            {prepared.canSend ? (
              <button type="button" className="button button-secondary button-compact" disabled={busy} onClick={() => call(true)}>
                שליחה אוטומטית
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {note ? <p className="muted small-note">{note}</p> : null}
    </section>
  );
}
