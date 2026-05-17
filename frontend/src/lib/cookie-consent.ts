const STORAGE_KEY = "twin_cookie_consent_v1";

export type CookieConsentV1 = {
  v: 1;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export const COOKIE_CONSENT_EVENT = "twin-cookie-consent";
export const COOKIE_CONSENT_CLEARED_EVENT = "twin-cookie-consent-cleared";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

export function readCookieConsent(): CookieConsentV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.v !== 1) return null;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") return null;
    if (typeof parsed.decidedAt !== "string") return null;
    return {
      v: 1,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      decidedAt: parsed.decidedAt,
    };
  } catch {
    return null;
  }
}

export function hasCookieConsentDecision(): boolean {
  return readCookieConsent() !== null;
}

/** Floating cookie banner only on the registration flow (not home, login, or dashboard). */
function pathShowsCookieBanner(normalized: string): boolean {
  if (normalized === "/register") return true;
  // Optional locale prefix: /pl/register, /en/register
  return /^\/[a-z]{2}\/register$/.test(normalized);
}

export function normalizePathnameForCookieBanner(pathname: string): string {
  const raw = pathname.split("?")[0] || "/";
  return raw !== "/" && raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function shouldShowCookieBannerOnPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathShowsCookieBanner(normalizePathnameForCookieBanner(pathname));
}

export function writeCookieConsent(choice: { analytics: boolean; marketing: boolean }): void {
  const record: CookieConsentV1 = {
    v: 1,
    analytics: choice.analytics,
    marketing: choice.marketing,
    decidedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: record }));
}

export function clearCookieConsent(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CLEARED_EVENT));
}

export function optionalCookiesAllowed(): boolean {
  const c = readCookieConsent();
  return c !== null && (c.analytics || c.marketing);
}
