'use client';

import Link from 'next/link';
import { useI18n } from '@/components/i18n';

const copy = {
  en: {
    back: 'Back to home',
  },
  he: {
    back: 'חזרה לדף הבית',
  },
};

export function IntakeHero() {
  const { language, dir } = useI18n();
  const t = copy[language];

  return (
    <div className="intake-flow-wide" dir={dir}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/" className="text-link">
          ← {t.back}
        </Link>
      </p>
    </div>
  );
}
