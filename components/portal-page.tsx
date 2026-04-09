'use client';

import { useI18n } from '@/components/i18n';
import type { BankOffer, CaseRecord, DocumentRequirement } from '@/data/domain';

const copy = {
  en: {
    eyebrow: 'Client progress',
    titlePrefix: 'Case',
    subtitle: 'Read-only. Updates when your file moves forward.',
    noCase: 'Progress link unavailable',
    noCaseText: 'Ask the office for a fresh progress link.',
    currentStage: 'Current stage',
    currentPhase: 'Current phase',
    documents: 'Requested documents',
    offers: 'Bank offers',
    noOffers: 'Bank offers will appear here once the advisor logs them.',
    intakePhase: 'Intake complete',
    appraisalPhase: 'Appraisal / property documents',
    advisorPhase: 'Advisor / bank offers',
  },
  he: {
    eyebrow: 'התקדמות התיק',
    titlePrefix: 'תיק',
    subtitle: 'צפייה בלבד. מתעדכן כשהתיק מתקדם.',
    noCase: 'קישור ההתקדמות לא זמין',
    noCaseText: 'יש לבקש מהמשרד קישור התקדמות חדש.',
    currentStage: 'שלב נוכחי',
    currentPhase: 'השלב בתהליך',
    documents: 'מסמכים נדרשים',
    offers: 'הצעות בנק',
    noOffers: 'הצעות בנק יופיעו כאן אחרי שהיועץ יזין אותן.',
    intakePhase: 'השלמת פתיחה',
    appraisalPhase: 'שמאות / מסמכי נכס',
    advisorPhase: 'יועץ / הצעות בנקים',
  },
};

const stageLabels = {
  en: {
    'new-lead': 'New lead',
    'intake-submitted': 'Intake complete',
    approved: 'Approved',
    'portal-activated': 'Progress link sent',
    'documents-in-progress': 'Collecting documents',
    'secretary-review': 'Secretary review',
    'waiting-appraiser': 'Appraisal in progress',
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
    'waiting-appraiser': 'שמאות בתהליך',
    'appraisal-received': 'התקבלה שמאות',
    'ready-for-bank': 'מוכן ליועץ',
    'bank-negotiation': 'יועץ / הצעות בנקים',
    'recommendation-prepared': 'הוכנה המלצה',
    completed: 'הושלם',
  },
};

function phaseLabel(language: 'en' | 'he', stage: CaseRecord['stage']) {
  const t = copy[language];
  if (stage === 'waiting-appraiser' || stage === 'appraisal-received') return t.appraisalPhase;
  if (stage === 'ready-for-bank' || stage === 'bank-negotiation' || stage === 'recommendation-prepared' || stage === 'completed') return t.advisorPhase;
  return t.intakePhase;
}

export function PortalPageClient({ caseRecord, requiredDocuments, offers = [] }: { caseRecord?: CaseRecord; requiredDocuments: Array<DocumentRequirement & { required?: boolean }>; offers?: BankOffer[] }) {
  const { language } = useI18n();
  const t = copy[language];
  const labels = stageLabels[language];

  if (!caseRecord) {
    return (
      <section className="card">
        <p className="eyebrow">{t.eyebrow}</p>
        <h2>{t.noCase}</h2>
        <p className="muted">{t.noCaseText}</p>
      </section>
    );
  }

  return (
    <div className="grid cols-2">
      <section className="card">
        <p className="eyebrow">{t.eyebrow}</p>
        <h2>{caseRecord.leadName}</h2>
        <p className="muted">{t.titlePrefix} {caseRecord.id} · {t.subtitle}</p>
        <div className="review-grid" style={{ marginTop: 18 }}>
          <div className="review-row"><span>{t.currentPhase}</span><strong>{phaseLabel(language, caseRecord.stage)}</strong></div>
          <div className="review-row"><span>{t.currentStage}</span><strong>{labels[caseRecord.stage]}</strong></div>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">{t.documents}</p>
        <table className="table">
          <tbody>
            {requiredDocuments.filter((doc) => doc.required).map((doc) => (
              <tr key={doc.code}>
                <td>
                  <strong>{language === 'he' ? doc.labelHe : doc.labelEn}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <p className="eyebrow">{t.offers}</p>
        {offers.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Bank</th>
                <th>Status</th>
                <th>First payment</th>
                <th>Max payment</th>
                <th>Total repayment</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
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
        ) : (
          <p className="muted">{t.noOffers}</p>
        )}
      </section>
    </div>
  );
}
