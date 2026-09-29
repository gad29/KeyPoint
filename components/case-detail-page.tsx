'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { BankOffer, CaseRecord, CaseStage, DocumentRequirement } from '@/data/domain';
import { CaseTimeline } from '@/components/case-timeline';
import { CaseDocuments } from '@/components/case-documents';
import { InviteGenerator } from '@/components/forms/invite-generator';
import type { PresetFeatures, PresetId } from '@/lib/presets';
import { GENERIC_STAGE_KEYS, STAGE_LABELS_HE } from '@/lib/stage-labels';

const CASE_TYPE_LABELS: Record<string, string> = {
  'purchase-single-dwelling': 'רכישת דירה יחידה',
  'purchase-replacement-dwelling': 'רכישת דירה חלופית',
  'purchase-investment-dwelling': 'רכישת דירה להשקעה',
  'refinance': 'מחזור משכנתא',
  'all-purpose-against-home': 'הלוואה כנגד נכס',
  'discounted-program': 'מחיר למשתכן',
  'self-build': 'בניה עצמית',
  'renovation': 'שיפוץ',
};

const PROFILE_LABELS: Record<string, string> = {
  salaried: 'שכיר',
  'self-employed': 'עצמאי',
  student: 'סטודנט',
  benefits: 'קצבאות',
  pensioner: 'פנסיונר',
  'new-immigrant': 'עולה חדש',
  'foreign-income': 'הכנסה מחו"ל',
};

const STAGE_LABELS: Record<string, string> = STAGE_LABELS_HE;


const OFFER_STATUS_LABELS: Record<string, string> = {
  'not-started': 'לא החל',
  'requested': 'נשלח לבנק',
  'received': 'הצעה התקבלה',
  'expired': 'פג תוקף',
};

type TabId = 'details' | 'documents' | 'offers' | 'invoice' | 'notes' | 'portal';

const TAB_LABELS: Record<TabId, string> = {
  details: 'פרטים',
  documents: 'מסמכים',
  offers: 'הצעות בנק',
  invoice: 'חיוב וגבייה',
  notes: 'הערות',
  portal: 'פורטל לקוח',
};

type Props = {
  caseRecord: CaseRecord;
  initialOffers: BankOffer[];
  checklist: (DocumentRequirement & { required: boolean })[];
  presetId: PresetId;
  presetFeatures: PresetFeatures;
};

export function CaseDetailPage({ caseRecord, initialOffers, checklist, presetId, presetFeatures }: Props) {
  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'details', label: TAB_LABELS.details },
    { id: 'documents', label: TAB_LABELS.documents },
    ...(presetFeatures.bankOffers ? [{ id: 'offers' as TabId, label: TAB_LABELS.offers }] : []),
    ...(presetFeatures.invoicing ? [{ id: 'invoice' as TabId, label: TAB_LABELS.invoice }] : []),
    { id: 'notes', label: TAB_LABELS.notes },
    { id: 'portal', label: TAB_LABELS.portal },
  ];
  const stageOptions = presetId === 'mortgage-advisor'
    ? Object.entries(STAGE_LABELS)
    : Object.entries(STAGE_LABELS).filter(([key]) => GENERIC_STAGE_KEYS.has(key));
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [chaseStatus, setChaseStatus] = useState('');
  const [caseData, setCaseData] = useState(caseRecord);
  const [offers, setOffers] = useState(initialOffers);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [addingOffer, setAddingOffer] = useState(false);

  // Stage update (from timeline click)
  async function handleStageClick(stage: CaseStage) {
    if (stage === caseData.stage) return;
    if (!confirm(`שנות שלב ל"${STAGE_LABELS[stage] ?? stage}"?`)) return;
    const res = await fetch(`/api/cases/${caseData.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    if (res.ok) {
      const json = await res.json() as { data?: CaseRecord };
      if (json.data) setCaseData(json.data);
      setSaveStatus('שלב עודכן ✓');
    }
  }

  // Case details save
  async function handleSaveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus('');
    const fd = new FormData(e.currentTarget);
    const body = {
      stage: fd.get('stage') as CaseStage,
      assignedTo: (fd.get('assignedTo') as string).trim(),
      nextAction: (fd.get('nextAction') as string).trim(),
      missingItemsCount: Number(fd.get('missingItemsCount') ?? 0),
      notesAppend: (fd.get('notesAppend') as string).trim(),
    };
    try {
      const res = await fetch(`/api/cases/${caseData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { data?: CaseRecord; error?: string };
      if (res.ok && json.data) {
        setCaseData(json.data);
        setSaveStatus('נשמר בהצלחה ✓');
      } else {
        setSaveStatus(json.error ?? 'שגיאה בשמירה');
      }
    } finally {
      setSaving(false);
    }
  }

  // Add bank offer
  async function handleAddOffer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddingOffer(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      bank: (fd.get('bank') as string).trim(),
      status: fd.get('status') as string,
      firstPayment: (fd.get('firstPayment') as string).trim(),
      maxPayment: (fd.get('maxPayment') as string).trim(),
      totalRepayment: (fd.get('totalRepayment') as string).trim(),
      expiresAt: (fd.get('expiresAt') as string).trim(),
    };
    try {
      const res = await fetch(`/api/cases/${caseData.id}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const refetch = await fetch(`/api/cases/${caseData.id}/offers`);
        if (refetch.ok) {
          const json = await refetch.json() as { data?: BankOffer[] };
          if (json.data) setOffers(json.data);
        }
        (e.target as HTMLFormElement).reset();
      }
    } finally {
      setAddingOffer(false);
    }
  }

  return (
    <div dir="rtl" style={{ maxWidth: 1100 }}>
      {/* Back link */}
      <Link href="/office/active" className="case-back-link">
        ← חזרה לרשימת התיקים
      </Link>

      {/* Case header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="case-id-badge">{caseData.id}</span>
              <span className="badge">{STAGE_LABELS[caseData.stage] ?? caseData.stage}</span>
              {caseData.missingItems > 0 && (
                <span className="badge danger" style={{ color: 'var(--danger)' }}>
                  {caseData.missingItems} מסמכים חסרים
                </span>
              )}
            </div>
            <h2 style={{ margin: '10px 0 4px', fontWeight: 800, fontSize: 'clamp(20px, 3vw, 28px)', letterSpacing: '-0.02em' }}>
              {caseData.leadName}
              {caseData.spouseName && <span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: '0.75em' }}> & {caseData.spouseName}</span>}
            </h2>
            <p className="muted" style={{ fontSize: 14 }}>
              {presetFeatures.mortgageColumns
                ? (CASE_TYPE_LABELS[caseData.caseType] ?? caseData.caseType)
                : 'לקוח'}
              {caseData.assignedTo && ` · אחראי: ${caseData.assignedTo}`}
            </p>
            {presetFeatures.mortgageColumns && caseData.borrowerProfiles.length > 0 && (
              <div className="profile-tags">
                {caseData.borrowerProfiles.map((p) => (
                  <span key={p} className="profile-tag">{PROFILE_LABELS[p] ?? p}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {caseData.phone && (
              <a href={`tel:${caseData.phone}`} className="button button-secondary button-compact">
                {caseData.phone}
              </a>
            )}
          </div>
        </div>

        {/* Stage timeline */}
        <div style={{ marginTop: 20 }}>
          <CaseTimeline currentStage={caseData.stage} onStageClick={handleStageClick} presetId={presetId} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: פרטים */}
      {activeTab === 'details' && (
        <form className="card" onSubmit={handleSaveDetails}>
          <p className="eyebrow" style={{ marginBottom: 16 }}>פרטי תיק ועדכון שלב</p>
          <div className="form-grid cols-2">
            <label className="field">
              <span>שלב נוכחי</span>
              <select name="stage" defaultValue={caseData.stage}>
                {stageOptions.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>אחראי תיק</span>
              <input name="assignedTo" defaultValue={caseData.assignedTo} placeholder="שם אחראי" />
            </label>
            <label className="field field-span-2">
              <span>פעולה הבאה</span>
              <input name="nextAction" defaultValue={caseData.nextAction} placeholder="מה הפעולה הבאה הנדרשת?" />
            </label>
            <label className="field">
              <span>מסמכים חסרים</span>
              <input name="missingItemsCount" type="number" min="0" defaultValue={caseData.missingItems} />
            </label>
            <label className="field field-span-2">
              <span>הוספת הערה פנימית</span>
              <textarea name="notesAppend" placeholder="הערה זו תתווסף לרשומה ב-Airtable…" style={{ minHeight: 80 }} />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 12 }}>
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'שומר…' : 'שמור שינויים'}
            </button>
            {saveStatus && <span className={saveStatus.includes('שגיאה') ? 'text-feedback-error' : 'muted'}>{saveStatus}</span>}
          </div>
        </form>
      )}

      {/* Tab: מסמכים */}
      {activeTab === 'documents' && (
        <CaseDocuments caseId={caseData.id} checklist={checklist} />
      )}

      {/* Tab: הצעות בנק (mortgage-advisor preset only) */}
      {activeTab === 'offers' && presetFeatures.bankOffers && (
        <div className="grid">
          <section className="card">
            <p className="eyebrow" style={{ marginBottom: 12 }}>הצעות שהתקבלו</p>
            {offers.length === 0 ? (
              <p className="muted">אין הצעות עדיין. הוסף הצעת בנק למטה.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>בנק</th>
                    <th>סטטוס</th>
                    <th>תשלום ראשון</th>
                    <th>תשלום מקסימלי</th>
                    <th>סה"כ החזר</th>
                    <th>תוקף עד</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer, i) => (
                    <tr key={i}>
                      <td><strong>{offer.bank}</strong></td>
                      <td>
                        <span className={`badge ${offer.status === 'received' ? 'good' : offer.status === 'expired' ? 'danger' : ''}`}>
                          {OFFER_STATUS_LABELS[offer.status] ?? offer.status}
                        </span>
                      </td>
                      <td>{offer.firstPayment ?? '—'}</td>
                      <td>{offer.maxPayment ?? '—'}</td>
                      <td>{offer.totalRepayment ?? '—'}</td>
                      <td>{offer.expiresAt ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <form className="card" onSubmit={handleAddOffer}>
            <p className="eyebrow" style={{ marginBottom: 16 }}>הוספת הצעת בנק</p>
            <div className="form-grid cols-2">
              <label className="field">
                <span>שם בנק</span>
                <input name="bank" required placeholder="כגון: בנק לאומי" />
              </label>
              <label className="field">
                <span>סטטוס</span>
                <select name="status" defaultValue="requested">
                  <option value="not-started">לא החל</option>
                  <option value="requested">נשלח לבנק</option>
                  <option value="received">הצעה התקבלה</option>
                  <option value="expired">פג תוקף</option>
                </select>
              </label>
              <label className="field">
                <span>תשלום ראשון (₪)</span>
                <input name="firstPayment" placeholder="6,500" />
              </label>
              <label className="field">
                <span>תשלום מקסימלי (₪)</span>
                <input name="maxPayment" placeholder="7,200" />
              </label>
              <label className="field">
                <span>סה"כ החזר (₪)</span>
                <input name="totalRepayment" placeholder="2,150,000" />
              </label>
              <label className="field">
                <span>תוקף עד</span>
                <input name="expiresAt" type="date" />
              </label>
            </div>
            <button className="button" type="submit" disabled={addingOffer}>
              {addingOffer ? 'מוסיף…' : 'הוסף הצעה'}
            </button>
          </form>
        </div>
      )}

      {/* Tab: חיוב וגבייה (default preset + any preset with invoicing) */}
      {activeTab === 'invoice' && presetFeatures.invoicing && (
        <section className="card" style={{ display: 'grid', gap: 16 }}>
          <p className="eyebrow">חיוב וגבייה</p>
          <p className="muted">
            שליחת חשבונית ומעקב תשלומים משיקים בשלב 4. השלב הנוכחי מציג את פעולות הקליק-אחד ומפעיל את הזרמת n8n כשקיימת.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="button"
              onClick={async () => {
                setChaseStatus('שולח לחשבונית…');
                const res = await fetch('/api/invoices', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ caseId: caseData.id }),
                });
                const json = await res.json() as { ok: boolean; error?: string };
                setChaseStatus(json.ok ? 'נשלח ✓' : json.error || 'נכשל');
              }}
            >
              שליחת חשבונית
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={async () => {
                setChaseStatus('מפעיל תזכורת תשלום…');
                const res = await fetch('/api/chase', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ invoiceId: caseData.id }),
                });
                const json = await res.json() as { ok: boolean; error?: string };
                setChaseStatus(json.ok ? 'תזכורת נשלחה ✓' : json.error || 'נכשל');
              }}
            >
              תזכורת תשלום
            </button>
          </div>
          {chaseStatus ? <p className="muted small">{chaseStatus}</p> : null}
        </section>
      )}

      {/* Tab: הערות */}
      {activeTab === 'notes' && (
        <section className="card">
          <p className="eyebrow" style={{ marginBottom: 12 }}>הערות פנימיות</p>
          <p className="muted" style={{ fontSize: 14 }}>
            הערות נשמרות ב-Airtable תחת Activity Log. להוספת הערה חדשה עבור ללשונית &quot;פרטים&quot;.
          </p>
          {caseData.nextAction && (
            <div className="review-row" style={{ marginTop: 16 }}>
              <span className="muted">פעולה הבאה</span>
              <strong>{caseData.nextAction}</strong>
            </div>
          )}
        </section>
      )}

      {/* Tab: פורטל לקוח */}
      {activeTab === 'portal' && (
        <div className="grid">
          <div className="card" style={{ background: 'var(--panel)' }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>פרטי לקוח</p>
            <div className="review-grid">
              {caseData.phone && (
                <div className="review-row">
                  <span>טלפון / וואטסאפ</span>
                  <a href={`tel:${caseData.phone}`} className="mini-link">{caseData.phone}</a>
                </div>
              )}
              {caseData.email && (
                <div className="review-row">
                  <span>אימייל</span>
                  <a href={`mailto:${caseData.email}`} className="mini-link">{caseData.email}</a>
                </div>
              )}
            </div>
          </div>
          <InviteGenerator caseId={caseData.id} />
        </div>
      )}
    </div>
  );
}
