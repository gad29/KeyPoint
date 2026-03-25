'use client';

import { InviteGenerator } from '@/components/forms/invite-generator';
import { useI18n } from '@/components/i18n';
import type { BankOffer, CaseRecord } from '@/data/domain';

type OfficePageClientProps = {
  cases: CaseRecord[];
  sampleOffers: BankOffer[];
  primaryCaseId?: string;
  liveMode: boolean;
};

const stageLabels = {
  en: {
    'new-lead': 'New lead',
    'intake-submitted': 'Intake submitted',
    approved: 'Approved',
    'portal-activated': 'Portal activated',
    'documents-in-progress': 'Documents in progress',
    'secretary-review': 'Secretary review',
    'waiting-appraiser': 'Waiting for appraiser',
    'appraisal-received': 'Appraisal received',
    'ready-for-bank': 'Ready for bank',
    'bank-negotiation': 'Bank negotiation',
    'recommendation-prepared': 'Recommendation prepared',
    completed: 'Completed',
  },
  he: {
    'new-lead': 'ליד חדש',
    'intake-submitted': 'התקבל טופס פתיחה',
    approved: 'אושר',
    'portal-activated': 'אזור לקוח הופעל',
    'documents-in-progress': 'איסוף מסמכים',
    'secretary-review': 'בדיקת מזכירות',
    'waiting-appraiser': 'ממתין לשמאי',
    'appraisal-received': 'התקבלה שמאות',
    'ready-for-bank': 'מוכן להגשה לבנקים',
    'bank-negotiation': 'משא ומתן מול בנקים',
    'recommendation-prepared': 'הוכנה המלצה',
    completed: 'הושלם',
  },
};

const copy = {
  en: {
    eyebrow: 'Office',
    title: 'All cases in one working view',
    body: 'Track active files, completed cases, missing documents, and next steps from one clean operations screen.',
    live: 'Live workspace',
    local: 'Preview workspace',
    queue: 'Case list',
    case: 'Case',
    stage: 'Stage',
    missing: 'Missing',
    next: 'Next step',
    bank: 'Bank offers',
    bankName: 'Bank',
    bankStatus: 'Status',
    firstPayment: 'First payment',
    maxPayment: 'Max payment',
    expiry: 'Expiry',
  },
  he: {
    eyebrow: 'משרד',
    title: 'כל התיקים במקום אחד',
    body: 'מסך עבודה מסודר למעקב אחרי תיקים פעילים, תיקים שהושלמו, מסמכים חסרים והשלב הבא בכל תיק.',
    live: 'סביבת עבודה חיה',
    local: 'תצוגת מערכת',
    queue: 'רשימת תיקים',
    case: 'תיק',
    stage: 'שלב',
    missing: 'חסר',
    next: 'הפעולה הבאה',
    bank: 'הצעות בנקים',
    bankName: 'בנק',
    bankStatus: 'סטטוס',
    firstPayment: 'החזר ראשון',
    maxPayment: 'החזר מקסימלי',
    expiry: 'תוקף',
  },
};

export function OfficePageClient({ cases, sampleOffers, primaryCaseId, liveMode }: OfficePageClientProps) {
  const { language } = useI18n();
  const t = copy[language];
  const labels = stageLabels[language];

  return (
    <div className="grid">
      <section className="hero product-hero">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2>{t.title}</h2>
          <p className="muted">{t.body}</p>
        </div>
        <span className={`badge ${liveMode ? 'good' : 'warn'}`}>{liveMode ? t.live : t.local}</span>
      </section>

      <div className="grid cols-2">
        <section className="card">
          <p className="eyebrow">{t.queue}</p>
          <table className="table">
            <thead>
              <tr>
                <th>{t.case}</th>
                <th>{t.stage}</th>
                <th>{t.missing}</th>
                <th>{t.next}</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.leadName}</strong>
                    <div className="muted">{item.id} · {item.assignedTo}</div>
                  </td>
                  <td>{labels[item.stage]}</td>
                  <td>{item.missingItems}</td>
                  <td className="muted">{item.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="grid">
          {primaryCaseId ? <InviteGenerator caseId={primaryCaseId} /> : null}
          <section className="card">
            <p className="eyebrow">{t.bank}</p>
            <table className="table">
              <thead>
                <tr>
                  <th>{t.bankName}</th>
                  <th>{t.bankStatus}</th>
                  <th>{t.firstPayment}</th>
                  <th>{t.maxPayment}</th>
                  <th>{t.expiry}</th>
                </tr>
              </thead>
              <tbody>
                {sampleOffers.map((offer) => (
                  <tr key={offer.bank}>
                    <td><strong>{offer.bank}</strong></td>
                    <td>{offer.status}</td>
                    <td>{offer.firstPayment ?? '-'}</td>
                    <td>{offer.maxPayment ?? '-'}</td>
                    <td>{offer.expiresAt ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
