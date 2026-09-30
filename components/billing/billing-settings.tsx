'use client';

import { useEffect, useState } from 'react';
import type { BillingSettings } from '@/lib/billing/types';
import type { BillingStatus } from '@/lib/billing/status';
import { CHASE_TONE_LABELS } from '@/lib/billing/labels';

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="review-row">
      <span>
        <span className={`status-dot ${ok ? 'good' : ''}`} aria-hidden="true" /> {label}
      </span>
      <span className="muted">{detail}</span>
    </div>
  );
}

export function BillingSettingsForm({ initial, status }: { initial: BillingSettings; status: BillingStatus }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  const update = (patch: Partial<BillingSettings>) => setSettings((s) => ({ ...s, ...patch }));

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/billing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const json = (await res.json()) as { ok: boolean; error?: string; data?: BillingSettings };
      if (!json.ok || !json.data) throw new Error(json.error || 'השמירה נכשלה');
      setSettings(json.data);
      setMessage('ההגדרות נשמרו ✓');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid" dir="rtl" style={{ gap: 20, maxWidth: 980 }}>
      <div className="hero product-hero" style={{ marginBottom: 0 }}>
        <div>
          <p className="eyebrow">גבייה</p>
          <h2 style={{ margin: '8px 0 6px' }}>הגדרות חיוב ותזכורות</h2>
          <p className="muted" style={{ fontSize: 14 }}>איך הלקוחות משלמים, מתי יוצאות תזכורות ומה מחובר.</p>
        </div>
      </div>

      {!status.storageReady ? <p className="card muted">חיוב ותזכורות דורשים מסד נתונים (Postgres / Supabase).</p> : null}

      <section className="card">
        <p className="eyebrow" style={{ marginBottom: 10 }}>חיבורים</p>
        <div className="review-grid">
          <StatusRow label="תשלום בכרטיס (Stripe)" ok={status.stripe} detail={status.stripe ? 'מחובר' : 'STRIPE_SECRET_KEY לא הוגדר'} />
          <StatusRow
            label="אישור תשלום אוטומטי (Stripe webhook)"
            ok={status.stripeWebhook}
            detail={status.stripeWebhook ? 'מחובר' : `הגדירו ב-Stripe את ${origin}/api/webhooks/stripe`}
          />
          <StatusRow label="שליחת אימייל" ok={status.email} detail={status.email ? 'מחובר' : 'EMAIL_PROVIDER=resend או EMAIL_PROVIDER_WEBHOOK_URL'} />
          <StatusRow label="ניסוח תזכורות ב-AI (Claude)" ok={status.ai} detail={status.ai ? 'מחובר' : 'ANTHROPIC_API_KEY לא הוגדר — נעשה שימוש בנוסחים מובנים'} />
          <StatusRow label="הרצה יומית אוטומטית" ok={status.cron} detail={status.cron ? 'CRON_SECRET מוגדר' : 'הגדירו CRON_SECRET ו-n8n או Vercel Cron'} />
          {status.accounting.map((provider) => (
            <StatusRow
              key={provider.id}
              label={`חשבוניות מס — ${provider.label}`}
              ok={provider.configured && provider.canIssue}
              detail={!provider.canIssue ? 'בקרוב' : provider.configured ? (provider.verified ? 'מחובר' : 'מחובר (בטא — לא נבדק מול חשבון אמיתי)') : 'לא מחובר'}
            />
          ))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow" style={{ marginBottom: 10 }}>ברירות מחדל</p>
        <div className="form-grid cols-2">
          <label className="field">
            <span>מע״מ (%)</span>
            <input value={settings.defaultVatRate} onChange={(e) => update({ defaultVatRate: Number(e.target.value) })} inputMode="decimal" dir="ltr" />
          </label>
          <label className="field">
            <span>ימים לתשלום</span>
            <input value={settings.defaultDueDays} onChange={(e) => update({ defaultDueDays: Number(e.target.value) })} inputMode="numeric" dir="ltr" />
          </label>
          <label className="field field-span-2">
            <span>קישור תשלום משלכם (ביט, פייבוקס, PayPal — לא חובה)</span>
            <input value={settings.paymentLinkUrl} onChange={(e) => update({ paymentLinkUrl: e.target.value })} placeholder="https://…" dir="ltr" />
          </label>
          <label className="field field-span-2">
            <span>הוראות תשלום נוספות (למשל פרטי העברה בנקאית)</span>
            <textarea value={settings.paymentInstructions} onChange={(e) => update({ paymentInstructions: e.target.value })} rows={3} placeholder="בנק …, סניף …, חשבון …" />
          </label>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow" style={{ marginBottom: 6 }}>תזכורות תשלום</p>
        <p className="muted" style={{ marginTop: 0 }}>כמה ימים אחרי מועד התשלום יוצאת כל תזכורת. התזכורות נעצרות ברגע שהלקוח משלם.</p>
        <div className="cadence-grid">
          {settings.cadence.map((step, index) => (
            <label key={index} className="field cadence-step">
              <span>תזכורת {CHASE_TONE_LABELS[step.tone]}</span>
              <span className="cadence-input">
                <input
                  value={step.dayOffset}
                  onChange={(e) => update({ cadence: settings.cadence.map((s, i) => (i === index ? { ...s, dayOffset: Number(e.target.value) } : s)) })}
                  inputMode="numeric"
                  dir="ltr"
                  aria-label={`ימים לתזכורת ${index + 1}`}
                />
                <span className="muted">ימים</span>
              </span>
            </label>
          ))}
        </div>
        <div className="grid" style={{ gap: 10, marginTop: 12 }}>
          <label className={`choice-card toggle-row ${settings.autoSend ? 'selected' : ''}`}>
            <input type="checkbox" checked={settings.autoSend} onChange={(e) => update({ autoSend: e.target.checked })} disabled={!status.email} />
            <div>
              <strong>שליחה אוטומטית באימייל</strong>
              <p className="muted">{status.email ? 'כשכבוי (מומלץ בהתחלה), כל תזכורת ממתינה לאישור במסך הגבייה.' : 'דורש הגדרת שליחת אימייל.'}</p>
            </div>
          </label>
          <label className={`choice-card toggle-row ${settings.aiDrafts ? 'selected' : ''}`}>
            <input type="checkbox" checked={settings.aiDrafts} onChange={(e) => update({ aiDrafts: e.target.checked })} />
            <div>
              <strong>ניסוח אישי בעזרת AI</strong>
              <p className="muted">{status.ai ? 'Claude מנסח כל תזכורת לפי הטון והפרטים. אם משהו נכשל — נוסח מובנה.' : 'יופעל כשיוגדר ANTHROPIC_API_KEY. עד אז — נוסחים מובנים.'}</p>
            </div>
          </label>
        </div>
      </section>

      <div className="inline-actions">
        <button type="button" className="button" onClick={save} disabled={saving || !status.storageReady}>
          {saving ? 'שומר…' : 'שמירת ההגדרות'}
        </button>
        {message ? <span className="muted">{message}</span> : null}
      </div>
    </div>
  );
}
