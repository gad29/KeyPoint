'use client';

import { useI18n } from '@/components/i18n';
import type { CaseRecord, DocumentRequirement } from '@/data/domain';

const stageCopy = {
  en: ['Intake submitted', 'Portal activated', 'Documents in progress', 'Secretary review', 'Waiting for appraiser', 'Ready for bank work'],
  he: ['התקבל טופס פתיחה', 'אזור הלקוח הופעל', 'איסוף מסמכים', 'בדיקת מזכירות', 'ממתין לשמאי', 'מוכן לעבודה מול הבנקים'],
};

const copy = {
  en: {
    eyebrow: 'Client Portal',
    titlePrefix: 'Case',
    subtitle: 'A simple bilingual space where clients can follow progress and understand what is still needed.',
    timeline: 'Case progress',
    stepNote: 'The office updates each stage as the case moves forward.',
    docs: 'Required documents',
    docsLogic: 'Why it is needed',
    noCase: 'No case available',
    noCaseText: 'Connect live data or add a case to display the client portal.',
  },
  he: {
    eyebrow: 'אזור לקוחות',
    titlePrefix: 'תיק',
    subtitle: 'אזור ברור ונעים שבו הלקוח רואה את ההתקדמות בתיק ומבין בדיוק אילו מסמכים עדיין נדרשים.',
    timeline: 'התקדמות התיק',
    stepNote: 'הצוות מעדכן כל שלב לפי מצב התיק בפועל.',
    docs: 'מסמכים נדרשים',
    docsLogic: 'למה צריך את זה',
    noCase: 'אין כרגע תיק להצגה',
    noCaseText: 'יש לחבר נתונים חיים או להוסיף תיק כדי להציג את אזור הלקוחות.',
  },
};

export function PortalPageClient({ caseRecord, requiredDocuments }: { caseRecord?: CaseRecord; requiredDocuments: DocumentRequirement[] }) {
  const { language } = useI18n();
  const t = copy[language];
  const stages = stageCopy[language];

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
        <div className="timeline" style={{ marginTop: 18 }}>
          {stages.map((step, index) => (
            <div key={step} className="step">
              <strong>{index + 1}. {step}</strong>
              <p className="muted">{t.stepNote}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">{t.docs}</p>
        <table className="table">
          <thead>
            <tr>
              <th>{t.docs}</th>
              <th>{t.docsLogic}</th>
            </tr>
          </thead>
          <tbody>
            {requiredDocuments.map((doc) => (
              <tr key={doc.code}>
                <td>
                  <strong>{language === 'he' ? doc.labelHe : doc.labelEn}</strong>
                  <div className="muted">{language === 'he' ? doc.labelEn : doc.labelHe}</div>
                </td>
                <td className="muted">{doc.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
