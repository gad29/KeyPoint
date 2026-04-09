'use client';

import Link from 'next/link';
import { useI18n } from '@/components/i18n';

const copy = {
  en: {
    kicker: 'Mortgage advisory',
    title: 'Open your file online',
    lead: 'Your advisor sent you here. Submit details and documents in one place — we will continue with you from the office.',
    cta: 'Start your file',
    note: 'You will get a personal link to track progress.',
    staff: 'Staff login',
  },
  he: {
    kicker: 'ייעוץ משכנתאות',
    title: 'פתיחת תיק מקוונת',
    lead: 'היועץ הפנה אותך לכאן. ממלאים פרטים ומעלים מסמכים במקום אחד — המשך הטיפול מהמשרד.',
    cta: 'פתיחת תיק',
    note: 'אחרי השליחה תקבלו קישור אישי למעקב התקדמות.',
    staff: 'כניסת צוות',
  },
};

export function HomePageClient() {
  const { language, dir } = useI18n();
  const t = copy[language];

  return (
    <div className="landing" dir={dir}>
      <section className="landing-hero">
        <p className="landing-kicker">{t.kicker}</p>
        <h1 className="landing-title">{t.title}</h1>
        <p className="landing-lead">{t.lead}</p>
        <div className="landing-actions">
          <Link className="button button-landing" href="/intake">
            {t.cta}
          </Link>
          <Link className="button button-secondary button-landing-outline" href="/login?next=/office/active">
            {t.staff}
          </Link>
        </div>
        <p className="landing-note">{t.note}</p>
      </section>
    </div>
  );
}
