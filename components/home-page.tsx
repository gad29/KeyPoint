'use client';

import Link from 'next/link';
import { useI18n } from '@/components/i18n';

type Lang = 'en' | 'he';

interface Props {
  presetName: string;
  presetNameHe: string;
  presetTagline: string;
  presetTaglineHe: string;
  businessName: string;
  businessNameHe: string;
}

const copy = {
  en: {
    productName: 'Agency OS',
    steps: [
      {
        title: '1 · Send an onboarding link',
        body: 'Your client fills in their details, uploads what you need, and signs — no email ping-pong.',
      },
      {
        title: '2 · One-click missing-docs reminder',
        body: 'Missing something? Nudge the client with one button. Polite, in their language.',
      },
      {
        title: '3 · Updates & summaries during the job',
        body: 'Optional personal tracking link keeps the client in the loop while you focus on the work.',
      },
      {
        title: '4 · Issue the invoice',
        body: 'Send an invoice through Stripe, iCount, Green Invoice, QuickBooks or Xero — pick one, plug in your key.',
      },
      {
        title: '5 · Auto-chase late payments',
        body: 'Escalating AI-drafted emails with a one-click pay link. Stops the moment the client pays or replies.',
      },
    ],
    cta: 'Open a client file',
    ctaSecondary: 'Staff sign-in',
    note: 'Your workspace, your branding. Presets: small business (default), mortgage advisor, more coming.',
  },
  he: {
    productName: 'Agency OS',
    steps: [
      {
        title: '1 · שולחים קישור קליטה',
        body: 'הלקוח ממלא פרטים, מעלה מסמכים וחותם — בלי טניס אימיילים.',
      },
      {
        title: '2 · תזכורת למסמכים חסרים בלחיצה',
        body: 'חסר משהו? כפתור אחד שולח תזכורת מנומסת בשפה של הלקוח.',
      },
      {
        title: '3 · עדכונים וסיכומים תוך כדי העבודה',
        body: 'אפשרות לקישור מעקב אישי ללקוח בזמן שאתם ממשיכים לעבוד ברוגע.',
      },
      {
        title: '4 · שליחת חשבונית',
        body: 'שליחה דרך Stripe, iCount, Green Invoice, QuickBooks או Xero — בוחרים ומכניסים את המפתח.',
      },
      {
        title: '5 · מעקב אוטומטי אחרי תשלומים באיחור',
        body: 'סדרת תזכורות AI מסולמת עם לינק תשלום בקליק. עוצרת ברגע שהלקוח משלם או משיב.',
      },
    ],
    cta: 'פתיחת תיק לקוח',
    ctaSecondary: 'כניסת צוות',
    note: 'המשרד שלך, המיתוג שלך. פרסטים: עסק קטן (ברירת מחדל), יועץ משכנתאות, ועוד בהמשך.',
  },
} satisfies Record<Lang, unknown>;

export function HomePageClient({
  presetName,
  presetNameHe,
  presetTagline,
  presetTaglineHe,
  businessName,
  businessNameHe,
}: Props) {
  const { language, dir } = useI18n();
  const t = copy[language];
  const preset = language === 'he' ? presetNameHe : presetName;
  const tagline = language === 'he' ? presetTaglineHe : presetTagline;
  const business = language === 'he' ? businessNameHe : businessName;

  return (
    <div className="landing" dir={dir}>
      <section className="landing-hero">
        <p className="landing-kicker">{business || t.productName} · {preset}</p>
        <h1 className="landing-title">{tagline}</h1>
        <p className="landing-lead">
          {language === 'he'
            ? 'קליטה, מעקב וגבייה — הכול במקום אחד, בלי תבניות משעממות של AI.'
            : 'Onboarding, follow-through and getting paid — all in one place, without the templated AI look.'}
        </p>
        <div className="landing-actions">
          <Link className="button button-landing" href="/intake">{t.cta}</Link>
          <Link className="button button-secondary button-landing-outline" href="/login?next=/office/active">
            {t.ctaSecondary}
          </Link>
        </div>
        <p className="landing-note">{t.note}</p>
      </section>

      <section className="grid" style={{ gap: 12, marginTop: 32 }}>
        {t.steps.map((step) => (
          <article key={step.title} className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: 0 }}>{step.title}</h3>
            <p className="muted" style={{ margin: '8px 0 0' }}>{step.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
