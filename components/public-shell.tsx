'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { LanguageSwitch, useI18n } from '@/components/i18n';
import type { AgencyBranding } from '@/lib/onboarding/types';

/** Re-tints the theme's accent tokens from one brand color. */
function brandStyle(color: string): CSSProperties | undefined {
  if (!color) return undefined;
  const strong = `color-mix(in srgb, ${color} 78%, black)`;
  return {
    '--accent': color,
    '--gold': color,
    '--accent-strong': strong,
    '--gold-strong': strong,
    '--gold-soft': `color-mix(in srgb, ${color} 65%, white)`,
    '--panel-3': `color-mix(in srgb, ${color} 12%, transparent)`,
  } as CSSProperties;
}

const copy = {
  en: { staff: 'Staff login', home: 'Home' },
  he: { staff: 'כניסת צוות', home: 'בית' },
};

export function PublicFrame({ children, branding }: { children: ReactNode; branding: AgencyBranding }) {
  const { language, dir } = useI18n();
  const t = copy[language];
  const name = language === 'he' ? branding.nameHe : branding.name;

  return (
    <div className="public-root" dir={dir} style={brandStyle(branding.primaryColor)}>
      <header className="public-topbar">
        <Link href="/" className="public-brand">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- tenant-provided remote logo
            <img src={branding.logoUrl} alt="" className="public-brand-logo" />
          ) : null}
          <span>{name}</span>
        </Link>
        <div className="public-topbar-actions">
          <Link href="/" className="public-nav-link">
            {t.home}
          </Link>
          <LanguageSwitch />
          <Link href="/login?next=/office/active" className="button button-compact">
            {t.staff}
          </Link>
        </div>
      </header>
      <main className="public-main">{children}</main>
    </div>
  );
}
