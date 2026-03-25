'use client';

import { StatCard } from '@/components/layout';
import { useI18n } from '@/components/i18n';

type HomePageClientProps = {
  activeCases: string;
  reviewQueue: string;
  receivedOffers: string;
  documentCount: number;
  liveMode: boolean;
};

const copy = {
  en: {
    eyebrow: 'Home',
    title: 'A mortgage operation your clients can actually trust',
    body: 'KeyPoint gives your office one clear place for intake, case tracking, document collection, and client follow-up — without the clutter of internal build notes or temporary setup language.',
    cta: 'Open a new case',
    statusLive: 'Connected to live data',
    statusLocal: 'Ready for daily work',
    statCases: 'Cases in system',
    statCasesHint: 'Includes active and completed files currently loaded into the workspace.',
    statReview: 'Needs staff attention',
    statReviewHint: 'Cases waiting on documents or internal review.',
    statOffers: 'Bank offers received',
    statOffersHint: 'Offers already logged for ongoing negotiations.',
    sectionValue: 'What the system handles',
    sectionValueItems: [
      'Client intake in a clear step-by-step flow',
      'Case tracking for active and completed mortgage files',
      'Document checklist management for each case type',
      'Office-side follow-up and client portal access',
    ],
    sectionDocs: 'Document coverage',
    sectionDocsText: 'The document library already includes the core checklist structure for Israeli mortgage workflows, with matching logic by case type and borrower profile.',
    sectionDocsCount: 'document types currently configured',
  },
  he: {
    eyebrow: 'דף הבית',
    title: 'מערכת ניהול משכנתאות שנראית כמו מוצר אמיתי',
    body: 'KeyPoint מרכזת במקום אחד את פתיחת התיק, מעקב ההתקדמות, איסוף המסמכים והתקשורת עם הלקוח — בלי הערות פיתוח, בלי טקסטים זמניים ובלי תחושת דמו.',
    cta: 'פתיחת תיק חדש',
    statusLive: 'מחובר לנתונים חיים',
    statusLocal: 'מוכן לעבודה שוטפת',
    statCases: 'תיקים במערכת',
    statCasesHint: 'כולל תיקים פעילים ותיקים שהושלמו ונטענו למערכת.',
    statReview: 'ממתין לטיפול צוות',
    statReviewHint: 'תיקים שחסרים בהם מסמכים או ממתינים לבדיקה פנימית.',
    statOffers: 'הצעות בנק שהתקבלו',
    statOffersHint: 'הצעות שכבר הוזנו עבור תיקים שנמצאים במשא ומתן.',
    sectionValue: 'מה המערכת נותנת בפועל',
    sectionValueItems: [
      'פתיחת תיק דיגיטלית בתהליך ברור ונעים ללקוח',
      'ניהול תיקים פעילים ותיקים סגורים במקום אחד',
      'רשימת מסמכים חכמה לפי סוג תיק ופרופיל לווים',
      'עבודה משרדית מסודרת לצד אזור לקוח נגיש',
    ],
    sectionDocs: 'כיסוי מסמכים',
    sectionDocsText: 'ספריית המסמכים כבר כוללת את שלד הדרישות המרכזי לעולם המשכנתאות בישראל, עם התאמה לפי סוג העסקה ופרופיל ההכנסה של הלקוח.',
    sectionDocsCount: 'סוגי מסמכים מוגדרים כרגע',
  },
};

export function HomePageClient({ activeCases, reviewQueue, receivedOffers, documentCount, liveMode }: HomePageClientProps) {
  const { language } = useI18n();
  const t = copy[language];

  return (
    <div className="grid">
      <section className="hero product-hero">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2>{t.title}</h2>
          <p className="muted">{t.body}</p>
        </div>
        <div className="hero-actions">
          <a className="button" href="/intake">{t.cta}</a>
          <span className={`badge ${liveMode ? 'good' : 'warn'}`}>{liveMode ? t.statusLive : t.statusLocal}</span>
        </div>
      </section>

      <div className="grid cols-3">
        <StatCard label={t.statCases} value={activeCases} hint={t.statCasesHint} />
        <StatCard label={t.statReview} value={reviewQueue} hint={t.statReviewHint} />
        <StatCard label={t.statOffers} value={receivedOffers} hint={t.statOffersHint} />
      </div>

      <div className="grid cols-2">
        <section className="card">
          <p className="eyebrow">{t.sectionValue}</p>
          <ul className="list">
            {t.sectionValueItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <p className="eyebrow">{t.sectionDocs}</p>
          <p className="muted">{t.sectionDocsText}</p>
          <div className="big-number">{documentCount}</div>
          <p className="muted">{t.sectionDocsCount}</p>
        </section>
      </div>
    </div>
  );
}
