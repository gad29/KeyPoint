'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'en' | 'he';

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  dir: 'ltr' | 'rtl';
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('he');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('keypoint-language') : null;
    if (saved === 'en' || saved === 'he') {
      setLanguage(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('keypoint-language', language);
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.body.setAttribute('data-language', language);
    document.body.setAttribute('dir', language === 'he' ? 'rtl' : 'ltr');
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      dir: language === 'he' ? 'rtl' : 'ltr',
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}

export function LanguageSwitch() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="language-switch" role="tablist" aria-label="Language switch">
      <button
        type="button"
        className={`language-option ${language === 'he' ? 'active' : ''}`}
        onClick={() => setLanguage('he')}
      >
        עברית
      </button>
      <button
        type="button"
        className={`language-option ${language === 'en' ? 'active' : ''}`}
        onClick={() => setLanguage('en')}
      >
        English
      </button>
    </div>
  );
}
