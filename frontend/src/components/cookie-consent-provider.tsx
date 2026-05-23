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
  COOKIE_CONSENT_CLEARED_EVENT,
  COOKIE_CONSENT_EVENT,
  clearCookieConsent,
  getCookieConsent,
  setCookieConsent,
  type CookieConsentRecord,
} from "@/lib/cookie-consent";
import { syncCookieConsentToServer } from "@/lib/cookie-consent-sync";

type CookieConsentContextValue = {
  consent: CookieConsentRecord | null;
  hasDecided: boolean;
  analyticsAllowed: boolean;
  marketingAllowed: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  resetConsent: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentRecord | null>(null);

  useEffect(() => {
    setConsent(getCookieConsent());
    const onConsent = (e: Event) => {
      const detail = (e as CustomEvent<CookieConsentRecord>).detail;
      const next = detail ?? getCookieConsent();
      setConsent(next);
      if (next) void syncCookieConsentToServer(next);
    };
    const onCleared = () => setConsent(null);
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    window.addEventListener(COOKIE_CONSENT_CLEARED_EVENT, onCleared);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
      window.removeEventListener(COOKIE_CONSENT_CLEARED_EVENT, onCleared);
    };
  }, []);

  const acceptAll = useCallback(() => {
    setConsent(setCookieConsent({ analytics: true, marketing: true }));
  }, []);

  const rejectNonEssential = useCallback(() => {
    setConsent(setCookieConsent({ analytics: false, marketing: false }));
  }, []);

  const resetConsent = useCallback(() => {
    clearCookieConsent();
    setConsent(null);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      hasDecided: consent !== null,
      analyticsAllowed: consent?.analytics === true,
      marketingAllowed: consent?.marketing === true,
      acceptAll,
      rejectNonEssential,
      resetConsent,
    }),
    [acceptAll, consent, rejectNonEssential, resetConsent],
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}
