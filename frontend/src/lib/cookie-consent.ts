import { safeStorage } from "@/lib/safe-storage";

export const COOKIE_CONSENT_STORAGE_KEY = "twin_cookie_consent_v1";
export const COOKIE_CONSENT_STORAGE_VERSION = 1;

/** Canonical persisted record (localStorage JSON). */
export type CookieConsentRecord = {
  version: typeof COOKIE_CONSENT_STORAGE_VERSION;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

/** @deprecated Use `CookieConsentRecord`. */
export type CookieConsentV1 = CookieConsentRecord;

export const COOKIE_CONSENT_EVENT = "twin-cookie-consent";
export const COOKIE_CONSENT_CLEARED_EVENT = "twin-cookie-consent-cleared";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

function readVersion(parsed: Record<string, unknown>): number | null {
  if (typeof parsed.version === "number") return parsed.version;
  if (typeof parsed.v === "number") return parsed.v;
  return null;
}

/** Pure JSON parse — used in browser and unit tests. */
export function parseCookieConsentJson(raw: string): CookieConsentRecord | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (readVersion(parsed) !== COOKIE_CONSENT_STORAGE_VERSION) return null;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") return null;
    if (typeof parsed.decidedAt !== "string") return null;
    return {
      version: COOKIE_CONSENT_STORAGE_VERSION,
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      decidedAt: parsed.decidedAt,
    };
  } catch {
    return null;
  }
}

export function getCookieConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;
  const raw = safeStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  if (!raw) return null;
  return parseCookieConsentJson(raw);
}

/** @deprecated Use `getCookieConsent`. */
export const readCookieConsent = getCookieConsent;

export function hasDecidedCookieConsent(): boolean {
  return getCookieConsent() !== null;
}

/** @deprecated Use `hasDecidedCookieConsent`. */
export const hasCookieConsentDecision = hasDecidedCookieConsent;

export function analyticsConsentGranted(): boolean {
  return getCookieConsent()?.analytics === true;
}

export function marketingConsentGranted(): boolean {
  return getCookieConsent()?.marketing === true;
}

/** Show banner site-wide except fleeting OAuth handoff and PP1 public preview (zero cookies). */
function pathShowsCookieBanner(normalized: string): boolean {
  if (normalized.startsWith("/auth/callback")) return false;
  if (normalized === "/preview" || normalized.startsWith("/preview/")) return false;
  return true;
}

export function normalizePathnameForCookieBanner(pathname: string): string {
  const raw = pathname.split("?")[0] || "/";
  return raw !== "/" && raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function shouldShowCookieBannerOnPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathShowsCookieBanner(normalizePathnameForCookieBanner(pathname));
}

export function setCookieConsent(choice: { analytics: boolean; marketing: boolean }): CookieConsentRecord {
  const record: CookieConsentRecord = {
    version: COOKIE_CONSENT_STORAGE_VERSION,
    necessary: true,
    analytics: choice.analytics,
    marketing: choice.marketing,
    decidedAt: new Date().toISOString(),
  };
  safeStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: record }));
  }
  return record;
}

/** @deprecated Use `setCookieConsent`. */
export const writeCookieConsent = setCookieConsent;

export function clearCookieConsent(): void {
  if (typeof window === "undefined") return;
  safeStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CLEARED_EVENT));
}

export function optionalCookiesAllowed(): boolean {
  const c = getCookieConsent();
  return c !== null && (c.analytics || c.marketing);
}
