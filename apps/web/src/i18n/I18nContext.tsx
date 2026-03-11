import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { en, type Translations } from './translations/en';
import { pl } from './translations/pl';

export type Locale = 'en' | 'pl';

const translations: Record<Locale, Translations> = { en, pl };

const LOCALE_KEY = 'bt_locale';

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === 'en' || stored === 'pl') return stored;
  } catch {
    // Ignore storage errors
  }
  return 'pl'; // Default to Polish
}

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const I18nContext = createContext<I18nState | null>(null);

export function useTranslation(): I18nState {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_KEY, newLocale);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const value: I18nState = {
    locale,
    setLocale,
    t: translations[locale],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
