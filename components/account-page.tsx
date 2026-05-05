'use client';

import { useState } from 'react';

const ROLE_LABELS: Record<string, string> = {
  advisor: 'יועץ',
  admin: 'אדמין',
  secretary: 'מזכירה',
  reception: 'קבלה',
  viewer: 'צפייה בלבד',
};

export function AccountPage({ email, role }: { email: string; role: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!currentPassword || !newPassword) {
      setError('יש להזין סיסמה נוכחית וסיסמה חדשה');
      return;
    }
    if (newPassword.length < 10) {
      setError('הסיסמה החדשה חייבת להכיל לפחות 10 תווים');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('האימות לא תואם לסיסמה החדשה');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/staff/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        setMessage('הסיסמה עודכנה בהצלחה ✓');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(json.error || 'עדכון הסיסמה נכשל');
      }
    } catch {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid" dir="rtl" style={{ maxWidth: 640, gap: 18 }}>
      <div className="hero product-hero hero-soft" style={{ marginBottom: 0 }}>
        <div>
          <p className="eyebrow">החשבון שלי</p>
          <h2 style={{ margin: '8px 0 6px' }}>הגדרות משתמש</h2>
          <p className="muted" style={{ fontSize: 13 }}>
            {email} · {ROLE_LABELS[role] || role}
          </p>
        </div>
      </div>

      <section className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>שינוי סיסמה</p>
        <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
          הזן את הסיסמה הנוכחית שלך וסיסמה חדשה. לאחר השינוי, יש להתחבר מחדש.
        </p>

        <form onSubmit={(e) => void submit(e)} className="grid" style={{ gap: 14 }}>
          <label className="field">
            <span>סיסמה נוכחית *</span>
            <div className="password-input-wrap">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? 'הסתר' : 'הצג'}
              >
                {showCurrent ? 'הסתר' : 'הצג'}
              </button>
            </div>
          </label>

          <label className="field">
            <span>סיסמה חדשה (לפחות 10 תווים) *</span>
            <div className="password-input-wrap">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={10}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? 'הסתר' : 'הצג'}
              >
                {showNew ? 'הסתר' : 'הצג'}
              </button>
            </div>
          </label>

          <label className="field">
            <span>אימות סיסמה חדשה *</span>
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? 'שומר…' : 'עדכן סיסמה'}
            </button>
            {message && <span className="text-feedback-success" style={{ fontSize: 14 }}>{message}</span>}
            {error && <span className="text-feedback-error" style={{ fontSize: 14 }}>{error}</span>}
          </div>
        </form>
      </section>
    </div>
  );
}
