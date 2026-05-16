"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LOCALE_STORAGE_KEY,
  detectBrowserLocale,
  translate,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === "en" || stored === "pl" ? stored : null;
}

function resolveLocale(): Locale {
  return readStoredLocale() ?? detectBrowserLocale();
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveLocale);

  useEffect(() => {
    const resolved = resolveLocale();
    setLocaleState((current) => (current === resolved ? current : resolved));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // private browsing / blocked storage
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // private browsing / blocked storage
    }
  }, []);

  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within LanguageProvider");
  }
  return ctx;
}
