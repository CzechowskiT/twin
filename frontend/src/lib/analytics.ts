import { COOKIE_CONSENT_EVENT, readCookieConsent, type CookieConsentV1 } from "@/lib/cookie-consent";
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
export function initAnalyticsFromConsent(consent: CookieConsentV1 | null) {
  if (typeof window === "undefined") return;
  if (!consent?.analytics) return;
  const domain = plausibleDomain();
  if (domain) injectPlausible(domain);
}

export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  const consent = readCookieConsent();
  if (!consent?.analytics) return;
  try {
    window.plausible?.(name, props ? { props } : undefined);
  } catch {
    /* ignore */
  }
  capturePosthog(name, props);
}

export function setupAnalyticsListeners() {
  if (typeof window === "undefined") return () => {};
  initAnalyticsFromConsent(readCookieConsent());
  const onConsent = (e: Event) => {
    const detail = (e as CustomEvent<CookieConsentV1>).detail;
    initAnalyticsFromConsent(detail ?? readCookieConsent());
  };
  window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
  return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
}
