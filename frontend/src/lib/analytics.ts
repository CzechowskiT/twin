import {
  COOKIE_CONSENT_EVENT,
  analyticsConsentGranted,
  getCookieConsent,
  marketingConsentGranted,
  type CookieConsentRecord,
} from "@/lib/cookie-consent";
import { safeStorage } from "@/lib/safe-storage";

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

const DISTINCT_ID_KEY = "twin_ph_distinct_id";

let plausibleLoaded = false;

function plausibleDomain(): string | null {
  const d = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  return d || null;
}

function posthogKey(): string | null {
  const k = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  return k || null;
}

/** True when optional analytics vendors are configured for this deployment. */
export function optionalAnalyticsConfigured(): boolean {
  return Boolean(posthogKey() || plausibleDomain());
}

function distinctId(): string {
  let id = safeStorage.getItem(DISTINCT_ID_KEY);
  if (!id) {
    id = `twin_${Math.random().toString(36).slice(2, 12)}`;
    safeStorage.setItem(DISTINCT_ID_KEY, id);
  }
  return id;
}

function injectPlausible(domain: string) {
  if (plausibleLoaded || document.querySelector('script[data-plausible="twin"]')) return;
  const s = document.createElement("script");
  s.defer = true;
  s.dataset.domain = domain;
  s.dataset.plausible = "twin";
  s.src = "https://plausible.io/js/script.js";
  document.head.appendChild(s);
  plausibleLoaded = true;
}

function capturePosthog(event: string, props?: Record<string, string | number | boolean>) {
  const key = posthogKey();
  if (!key) return;
  void fetch("https://us.i.posthog.com/capture/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      event,
      distinct_id: distinctId(),
      properties: { ...props, $lib: "twin-web" },
    }),
    keepalive: true,
  }).catch(() => {
    /* optional telemetry */
  });
}

/** Load Plausible script after analytics cookie consent. */
export function initAnalyticsFromConsent(consent: CookieConsentRecord | null) {
  if (typeof window === "undefined") return;
  if (!consent?.analytics) return;
  const domain = plausibleDomain();
  if (domain) injectPlausible(domain);
}

/** Future ad / retargeting pixels — gated separately from analytics. */
export function initMarketingFromConsent(consent: CookieConsentRecord | null) {
  if (typeof window === "undefined") return;
  if (!consent?.marketing) return;
  /* no third-party marketing pixels in MVP */
}

export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  if (!analyticsConsentGranted()) return;
  try {
    window.plausible?.(name, props ? { props } : undefined);
  } catch {
    /* ignore */
  }
  capturePosthog(name, props);
}

export function setupAnalyticsListeners() {
  if (typeof window === "undefined") return () => {};
  const boot = getCookieConsent();
  initAnalyticsFromConsent(boot);
  initMarketingFromConsent(boot);
  const onConsent = (e: Event) => {
    const detail = (e as CustomEvent<CookieConsentRecord>).detail;
    const next = detail ?? getCookieConsent();
    initAnalyticsFromConsent(next);
    initMarketingFromConsent(next);
  };
  window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
  return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
}

export { analyticsConsentGranted, marketingConsentGranted };
