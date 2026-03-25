'use client';

import { useI18n } from '@/components/i18n';

const copy = {
  en: {
    eyebrow: 'New Case',
    title: 'Open a mortgage case directly in KeyPoint',
    body: 'A clear bilingual intake flow for real client work — designed to feel like a finished product, not a temporary form.',
    status: 'Client-facing intake',
  },
  he: {
    eyebrow: 'פתיחת תיק',
    title: 'פתיחת תיק משכנתא ישירות בתוך KeyPoint',
    body: 'תהליך פתיחה דו-לשוני, ברור ומסודר, שמרגיש כמו מערכת אמיתית לעבודה מול לקוחות — לא כמו טופס זמני.',
    status: 'טופס פתיחה ללקוח',
  },
};

export function IntakeHero() {
  const { language } = useI18n();
  const t = copy[language];

  return (
    <section className="hero hero-soft product-hero">
      <div>
        <p className="eyebrow">{t.eyebrow}</p>
        <h2>{t.title}</h2>
        <p className="muted">{t.body}</p>
      </div>
      <span className="badge good">{t.status}</span>
    </section>
  );
}
