/**
 * Default-denied invariant for analytics consent.
 *
 * Freezes the contract that, until the user explicitly makes a choice on
 * the cookie banner, every consent gate in the frontend treats analytics
 * and marketing as **denied** — so PostHog / Plausible / future vendors
 * never fire.
 *
 * Pairs with `frontend/scripts/cookie-consent-parse.test.ts` (raw
 * record parsing) and `docs/P1_COOKIE_ANALYTICS_AUDIT_2026-05-27.md`
 * (the audit doc).
 *
 * Runs under `tsx` in node (no DOM) — same pattern as the existing
 * `npm run test:cookie-consent`. In node `safeStorage.getItem` returns
 * `null` (no `window`), which is the exact "no decision yet" branch
 * we want to assert against.
 */

import assert from "node:assert/strict";

import {
  analyticsConsentGranted,
  getCookieConsent,
  marketingConsentGranted,
} from "../src/lib/cookie-consent";
import { initAnalyticsFromConsent, initMarketingFromConsent, setupAnalyticsListeners } from "../src/lib/analytics";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (e) {
    console.error(`fail ${name}`, e);
    process.exitCode = 1;
  }
}

run("getCookieConsent() returns null when nothing is stored", () => {
  assert.equal(getCookieConsent(), null);
});

run("analyticsConsentGranted() defaults to false (denied)", () => {
  assert.equal(analyticsConsentGranted(), false);
});

run("marketingConsentGranted() defaults to false (denied)", () => {
  assert.equal(marketingConsentGranted(), false);
});

run("initAnalyticsFromConsent(null) is a no-op (no throw, no side-effect)", () => {
  // Throwing or attempting to inject a script in node would fail the assert.
  initAnalyticsFromConsent(null);
  // Also explicitly false-record: a stored "reject all" record must not arm
  // analytics either — the gate reads only the analytics flag.
  initAnalyticsFromConsent({
    version: 1,
    necessary: true,
    analytics: false,
    marketing: false,
    decidedAt: "2026-05-27T00:00:00.000Z",
  });
});

run("initMarketingFromConsent(null) is a no-op (no throw, no side-effect)", () => {
  initMarketingFromConsent(null);
  initMarketingFromConsent({
    version: 1,
    necessary: true,
    analytics: false,
    marketing: false,
    decidedAt: "2026-05-27T00:00:00.000Z",
  });
});

run("setupAnalyticsListeners() returns a no-op cleanup without window", () => {
  // Under node (no `window`) the function must short-circuit and return a
  // disposer that does nothing — never throws, never adds an event listener.
  const dispose = setupAnalyticsListeners();
  assert.equal(typeof dispose, "function");
  dispose(); // must not throw
});

if (process.exitCode) {
  process.exit(process.exitCode);
}
