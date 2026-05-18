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
  LOCALE_HTML_LANG,
  LOCALE_STORAGE_KEY,
  detectBrowserLocale,
  isLocale,
  localeIsRtl,
  translate,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";
import { safeStorage } from "@/lib/safe-storage";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const stored = safeStorage.getItem(LOCALE_STORAGE_KEY);
  return stored && isLocale(stored) ? stored : null;
}

function resolveLocale(): Locale {
  return readStoredLocale() ?? detectBrowserLocale();
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // First paint must match the server (always "en") to avoid React #418 hydration mismatches
  // when localStorage / navigator prefers another locale. We sync the real choice after mount.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const resolved = resolveLocale();
    queueMicrotask(() => {
      setLocaleState((current) => (current === resolved ? current : resolved));
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = LOCALE_HTML_LANG[locale];
    document.documentElement.dir = localeIsRtl(locale) ? "rtl" : "ltr";
    safeStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = LOCALE_HTML_LANG[next];
    document.documentElement.dir = localeIsRtl(next) ? "rtl" : "ltr";
    safeStorage.setItem(LOCALE_STORAGE_KEY, next);
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
