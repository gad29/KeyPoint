'use client';

import { useI18n } from '@/components/i18n';

const copy = {
  en: {
    eyebrow: 'Start intake',
    title: 'Open a mortgage case in a few clear steps.',
    body: 'Share the client details, financing picture, and first notes. After submission you can immediately attach the first documents.',
    status: 'Client-facing flow',
  },
  he: {
    eyebrow: 'פתיחת תיק',
    title: 'פותחים תיק משכנתא בכמה שלבים ברורים.',
    body: 'ממלאים את פרטי הלקוח, תמונת המימון והערות ראשונות. אחרי השליחה אפשר לצרף מיד את המסמכים הראשונים.',
    status: 'תהליך ללקוח',
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
