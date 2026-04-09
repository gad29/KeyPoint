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
    eyebrow: 'Mortgage intake',
    title: 'A clean mortgage intake and progress flow for real clients.',
    body: 'Clients can start a case, upload documents, and later check progress from a simple read-only link. The office gets one concise workspace to move each case forward.',
    cta: 'Start intake',
    ctaSecondary: 'Check progress link',
    office: 'Office login',
    statusLive: 'Live Airtable workspace',
    statusLocal: 'Preview mode',
    statCases: 'Open cases',
    statCasesHint: 'Current files visible in the workspace.',
    statReview: 'Office queue',
    statReviewHint: 'Cases waiting on review or documents.',
    statOffers: 'Offers logged',
    statOffersHint: 'Bank offers already added to live files.',
    sectionTitle: 'How it works',
    items: [
      'Client starts intake and uploads the first documents.',
      'A case is saved to Airtable and queued for the office.',
      'The client receives a read-only progress link.',
      'The secretary and advisor move the case through appraisal and bank-offer stages.',
    ],
    coverage: 'Configured documents',
    coverageText: 'The checklist already covers the core mortgage document set and matches required items by case type and borrower profile.',
  },
  he: {
    eyebrow: 'פתיחת תיק משכנתא',
    title: 'תהליך נקי וברור ללקוח ולמשרד.',
    body: 'הלקוח יכול לפתוח תיק, להעלות מסמכים ולעקוב אחר ההתקדמות דרך קישור צפייה פשוט. המשרד מקבל מסך עבודה מסודר לקידום כל תיק.',
    cta: 'התחלת פתיחת תיק',
    ctaSecondary: 'בדיקת קישור התקדמות',
    office: 'כניסת משרד',
    statusLive: 'מחובר ל-Airtable',
    statusLocal: 'מצב תצוגה',
    statCases: 'תיקים פתוחים',
    statCasesHint: 'התיקים שזמינים כרגע במערכת.',
    statReview: 'תור עבודה למשרד',
    statReviewHint: 'תיקים שממתינים לבדיקה או למסמכים.',
    statOffers: 'הצעות שנשמרו',
    statOffersHint: 'הצעות בנק שכבר נוספו לתיקים.',
    sectionTitle: 'איך זה עובד',
    items: [
      'הלקוח פותח תיק ומעלה מסמכים ראשונים.',
      'נוצר תיק חדש ב-Airtable ונכנס לטיפול המשרד.',
      'נשלח ללקוח קישור צפייה להתקדמות התיק.',
      'המזכירות והיועץ מקדמים את התיק דרך שמאות והצעות בנקים.',
    ],
    coverage: 'מסמכים מוגדרים',
    coverageText: 'רשימת המסמכים כבר כוללת את בסיס העבודה למשכנתא ומתאימה דרישות לפי סוג תיק ופרופיל הכנסה.',
  },
};

export function HomePageClient({ activeCases, reviewQueue, receivedOffers, documentCount, liveMode }: HomePageClientProps) {
  const { language } = useI18n();
  const t = copy[language];

  return (
    <div className="grid">
      <section className="hero product-hero home-hero-card card">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2>{t.title}</h2>
          <p className="muted">{t.body}</p>
        </div>
        <div className="hero-actions home-actions-stack">
          <a className="button" href="/intake">{t.cta}</a>
          <a className="button button-secondary" href="/login">{t.ctaSecondary}</a>
          <a className="text-link" href="/office">{t.office}</a>
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
          <p className="eyebrow">{t.sectionTitle}</p>
          <ul className="list">
            {t.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <p className="eyebrow">{t.coverage}</p>
          <div className="big-number">{documentCount}</div>
          <p className="muted">{t.coverageText}</p>
        </section>
      </div>
    </div>
  );
}
