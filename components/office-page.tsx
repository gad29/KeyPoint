'use client';

import { useMemo, useState } from 'react';
import { InviteGenerator } from '@/components/forms/invite-generator';
import { useI18n } from '@/components/i18n';
import type { BankOffer, CaseRecord, CaseStage } from '@/data/domain';

type OfficePageClientProps = {
  cases: CaseRecord[];
  offersByCase: Record<string, BankOffer[]>;
  liveMode: boolean;
};

const stageOptions: CaseStage[] = [
  'intake-submitted',
  'approved',
  'documents-in-progress',
  'secretary-review',
  'waiting-appraiser',
  'appraisal-received',
  'ready-for-bank',
  'bank-negotiation',
  'recommendation-prepared',
  'completed',
];

const stageLabels = {
  en: {
    'new-lead': 'New lead',
    'intake-submitted': 'Intake complete',
    approved: 'Approved',
    'portal-activated': 'Progress link sent',
    'documents-in-progress': 'Collecting documents',
    'secretary-review': 'Secretary review',
    'waiting-appraiser': 'Appraisal / property docs',
    'appraisal-received': 'Appraisal received',
    'ready-for-bank': 'Ready for advisor',
    'bank-negotiation': 'Advisor / bank offers',
    'recommendation-prepared': 'Recommendation prepared',
    completed: 'Completed',
  },
  he: {
    'new-lead': 'ליד חדש',
    'intake-submitted': 'הטופס הושלם',
    approved: 'אושר',
    'portal-activated': 'נשלח קישור התקדמות',
    'documents-in-progress': 'איסוף מסמכים',
    'secretary-review': 'בדיקת מזכירות',
    'waiting-appraiser': 'שמאות / מסמכי נכס',
    'appraisal-received': 'התקבלה שמאות',
    'ready-for-bank': 'מוכן ליועץ',
    'bank-negotiation': 'יועץ / הצעות בנקים',
    'recommendation-prepared': 'הוכנה המלצה',
    completed: 'הושלם',
  },
};

const copy = {
  en: {
    eyebrow: 'Office',
    title: 'Cases & stages',
    body: 'Update stages, notes, and client links. Syncs to Airtable.',
    live: 'Live workspace',
    local: 'Preview workspace',
    cases: 'Cases',
    selected: 'Selected case',
    stage: 'Stage',
    assignee: 'Owner',
    nextAction: 'Next action',
    missing: 'Missing items',
    note: 'Internal note',
    save: 'Save changes',
    saving: 'Saving…',
    addOffer: 'Add bank offer',
    bank: 'Bank',
    status: 'Status',
    firstPayment: 'First payment',
    maxPayment: 'Max payment',
    totalRepayment: 'Total repayment',
    expiry: 'Expiry',
    add: 'Add offer',
    adding: 'Adding…',
    noCases: 'No cases available.',
    phase: 'Workflow phase',
    offers: 'Offers',
    signOut: 'Sign out',
    statusSaved: 'Saved.',
    intakePhase: 'Intake complete',
    appraisalPhase: 'Appraisal / property docs',
    advisorPhase: 'Advisor / bank offers',
    pipeline: 'Pipeline',
    p1: 'Intake & documents (secretary)',
    p2: 'Property & appraiser',
    p3: 'Advisor & bank offers',
  },
  he: {
    eyebrow: 'משרד',
    title: 'תיקים ושלבים',
    body: 'עדכון שלבים, הערות וקישור ללקוח. מסתנכרן ל-Airtable.',
    live: 'סביבת עבודה חיה',
    local: 'מצב תצוגה',
    cases: 'תיקים',
    selected: 'תיק נבחר',
    stage: 'שלב',
    assignee: 'אחראי',
    nextAction: 'הפעולה הבאה',
    missing: 'מסמכים חסרים',
    note: 'הערה פנימית',
    save: 'שמירת שינויים',
    saving: 'שומר…',
    addOffer: 'הוספת הצעת בנק',
    bank: 'בנק',
    status: 'סטטוס',
    firstPayment: 'החזר ראשון',
    maxPayment: 'החזר מקסימלי',
    totalRepayment: 'החזר כולל',
    expiry: 'תוקף',
    add: 'הוספת הצעה',
    adding: 'מוסיף…',
    noCases: 'אין כרגע תיקים להצגה.',
    phase: 'שלב בתהליך',
    offers: 'הצעות',
    signOut: 'התנתקות',
    statusSaved: 'נשמר.',
    intakePhase: 'השלמת פתיחה',
    appraisalPhase: 'שמאות / מסמכי נכס',
    advisorPhase: 'יועץ / הצעות בנקים',
    pipeline: 'תהליך',
    p1: 'פתיחה ומסמכים — מזכירות',
    p2: 'נכס ושמאות',
    p3: 'יועץ והצעות בנקים',
  },
};

function phaseLabel(language: 'en' | 'he', stage: CaseStage) {
  const t = copy[language];
  if (stage === 'waiting-appraiser' || stage === 'appraisal-received') return t.appraisalPhase;
  if (stage === 'ready-for-bank' || stage === 'bank-negotiation' || stage === 'recommendation-prepared' || stage === 'completed') return t.advisorPhase;
  return t.intakePhase;
}

export function OfficePageClient({ cases, offersByCase, liveMode }: OfficePageClientProps) {
  const { language } = useI18n();
  const t = copy[language];
  const labels = stageLabels[language];

  async function signOut() {
    await fetch('/api/office/logout', { method: 'POST' });
    window.location.href = '/login';
  }
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || '');
  const [localCases, setLocalCases] = useState(cases);
  const [localOffers, setLocalOffers] = useState(offersByCase);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [offerState, setOfferState] = useState({ bank: '', status: 'requested', firstPayment: '', maxPayment: '', totalRepayment: '', expiresAt: '' });
  const [addingOffer, setAddingOffer] = useState(false);

  const selectedCase = useMemo(() => localCases.find((item) => item.id === selectedCaseId), [localCases, selectedCaseId]);
  const selectedOffers = selectedCase ? localOffers[selectedCase.id] || [] : [];

  async function saveCaseUpdates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCase) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setSaveStatus('');
    const body = {
      stage: String(form.get('stage') || selectedCase.stage),
      assignedTo: String(form.get('assignedTo') || selectedCase.assignedTo),
      nextAction: String(form.get('nextAction') || selectedCase.nextAction),
      missingItemsCount: Number(form.get('missingItemsCount') || selectedCase.missingItems || 0),
      notesAppend: String(form.get('notesAppend') || ''),
    };

    const res = await fetch(`/api/cases/${selectedCase.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);

    if (json.ok && json.data) {
      setLocalCases((current) => current.map((item) => (item.id === selectedCase.id ? json.data : item)));
      setSaveStatus(t.statusSaved);
      event.currentTarget.reset();
      return;
    }

    setSaveStatus(json.error || 'Failed');
  }

  async function addOffer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCase) return;
    setAddingOffer(true);
    const res = await fetch(`/api/cases/${selectedCase.id}/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(offerState),
    });
    const json = await res.json();
    setAddingOffer(false);

    if (json.ok) {
      setLocalOffers((current) => ({
        ...current,
        [selectedCase.id]: [...(current[selectedCase.id] || []), json.data],
      }));
      setOfferState({ bank: '', status: 'requested', firstPayment: '', maxPayment: '', totalRepayment: '', expiresAt: '' });
    }
  }

  if (!localCases.length) {
    return <section className="card"><h2>{t.noCases}</h2></section>;
  }

  return (
    <div className="grid">
      <section className="card pipeline-strip">
        <p className="eyebrow">{t.pipeline}</p>
        <ol className="pipeline-list">
          <li>{t.p1}</li>
          <li>{t.p2}</li>
          <li>{t.p3}</li>
        </ol>
      </section>
      <section className="hero product-hero">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2>{t.title}</h2>
          <p className="muted">{t.body}</p>
        </div>
        <div className="inline-actions">
          <span className={`badge ${liveMode ? 'good' : 'warn'}`}>{liveMode ? t.live : t.local}</span>
          <button className="button button-secondary" type="button" onClick={signOut}>{t.signOut}</button>
        </div>
      </section>

      <div className="grid cols-2 office-grid">
        <section className="card">
          <p className="eyebrow">{t.cases}</p>
          <div className="office-case-list">
            {localCases.map((item) => (
              <button key={item.id} type="button" className={`case-list-item ${item.id === selectedCaseId ? 'active' : ''}`} onClick={() => setSelectedCaseId(item.id)}>
                <strong>{item.leadName}</strong>
                <span>{labels[item.stage]}</span>
                <span className="muted">{phaseLabel(language, item.stage)}</span>
              </button>
            ))}
          </div>
        </section>

        {selectedCase ? (
          <div className="grid">
            <section className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{t.selected}</p>
                  <h3>{selectedCase.leadName}</h3>
                </div>
                <span className="badge">{selectedCase.id}</span>
              </div>
              <div className="review-grid compact" style={{ maxWidth: '100%' }}>
                <div className="review-row"><span>{t.phase}</span><strong>{phaseLabel(language, selectedCase.stage)}</strong></div>
                <div className="review-row"><span>{t.stage}</span><strong>{labels[selectedCase.stage]}</strong></div>
              </div>
            </section>

            <form className="card" onSubmit={saveCaseUpdates}>
              <div className="form-grid cols-2">
                <label className="field">
                  <span>{t.stage}</span>
                  <select name="stage" defaultValue={selectedCase.stage}>
                    {stageOptions.map((stage) => <option key={stage} value={stage}>{labels[stage]}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>{t.assignee}</span>
                  <input name="assignedTo" defaultValue={selectedCase.assignedTo} />
                </label>
                <label className="field field-span-2">
                  <span>{t.nextAction}</span>
                  <input name="nextAction" defaultValue={selectedCase.nextAction} />
                </label>
                <label className="field">
                  <span>{t.missing}</span>
                  <input name="missingItemsCount" type="number" min="0" defaultValue={selectedCase.missingItems} />
                </label>
                <label className="field field-span-2">
                  <span>{t.note}</span>
                  <textarea name="notesAppend" />
                </label>
              </div>
              <div className="inline-actions" style={{ justifyContent: 'space-between' }}>
                <button className="button" type="submit" disabled={saving}>{saving ? t.saving : t.save}</button>
                {saveStatus ? <span className="muted">{saveStatus}</span> : null}
              </div>
            </form>

            <InviteGenerator caseId={selectedCase.id} />

            <section className="card">
              <p className="eyebrow">{t.offers}</p>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t.bank}</th>
                    <th>{t.status}</th>
                    <th>{t.firstPayment}</th>
                    <th>{t.maxPayment}</th>
                    <th>{t.totalRepayment}</th>
                    <th>{t.expiry}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOffers.map((offer) => (
                    <tr key={`${offer.bank}-${offer.expiresAt || offer.status}`}>
                      <td><strong>{offer.bank}</strong></td>
                      <td>{offer.status}</td>
                      <td>{offer.firstPayment || '-'}</td>
                      <td>{offer.maxPayment || '-'}</td>
                      <td>{offer.totalRepayment || '-'}</td>
                      <td>{offer.expiresAt || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <form className="card" onSubmit={addOffer}>
              <p className="eyebrow">{t.addOffer}</p>
              <div className="form-grid cols-2">
                <label className="field"><span>{t.bank}</span><input value={offerState.bank} onChange={(e) => setOfferState((current) => ({ ...current, bank: e.target.value }))} /></label>
                <label className="field"><span>{t.status}</span><select value={offerState.status} onChange={(e) => setOfferState((current) => ({ ...current, status: e.target.value }))}><option value="requested">requested</option><option value="received">received</option><option value="expired">expired</option></select></label>
                <label className="field"><span>{t.firstPayment}</span><input value={offerState.firstPayment} onChange={(e) => setOfferState((current) => ({ ...current, firstPayment: e.target.value }))} /></label>
                <label className="field"><span>{t.maxPayment}</span><input value={offerState.maxPayment} onChange={(e) => setOfferState((current) => ({ ...current, maxPayment: e.target.value }))} /></label>
                <label className="field"><span>{t.totalRepayment}</span><input value={offerState.totalRepayment} onChange={(e) => setOfferState((current) => ({ ...current, totalRepayment: e.target.value }))} /></label>
                <label className="field"><span>{t.expiry}</span><input type="date" value={offerState.expiresAt} onChange={(e) => setOfferState((current) => ({ ...current, expiresAt: e.target.value }))} /></label>
              </div>
              <button className="button" type="submit" disabled={addingOffer}>{addingOffer ? t.adding : t.add}</button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
