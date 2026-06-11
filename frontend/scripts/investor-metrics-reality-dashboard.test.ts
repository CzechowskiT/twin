/**
 * Static guardrails for investor metrics reality dashboard.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { en, dictionaries, LOCALES } from "../src/lib/i18n";
import {
  DEFAULT_EXTERNAL_INVITES_SENT,
  INVESTOR_FORBIDDEN_TRACTION_PATTERNS,
  INVESTOR_METRICS_REALITY_ROUTE,
  INVESTOR_MODULE_LIVE_KEYS,
  LAUNCH_STANCE,
  resolveExternalInvitesSent,
} from "../src/lib/investor-metrics-reality";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("dashboard route exists at /investor/metrics", () => {
  assert.ok(read("src/app/investor/metrics/page.tsx").includes("InvestorMetricsRealityDashboard"));
  assert.equal(INVESTOR_METRICS_REALITY_ROUTE, "/investor/metrics");
});

test("live, demo, and not-live module sections are defined", () => {
  const component = read("src/components/investor/investor-metrics-reality-dashboard.tsx");
  assert.ok(component.includes("INVESTOR_METRICS_VISUAL_MARKERS.liveSection"));
  assert.ok(component.includes("INVESTOR_METRICS_VISUAL_MARKERS.demoSection"));
  assert.ok(component.includes("INVESTOR_METRICS_VISUAL_MARKERS.notLiveSection"));
  assert.ok(INVESTOR_MODULE_LIVE_KEYS.length >= 5);
});

test("launch stance NO-GO is visible", () => {
  assert.equal(LAUNCH_STANCE, "noGo");
  assert.match(en.investorMetrics.launchStanceNoGo, /NO-GO/);
});

test("external invites default to zero unless database source", () => {
  assert.equal(DEFAULT_EXTERNAL_INVITES_SENT, 0);
  assert.equal(resolveExternalInvitesSent(undefined).count, 0);
  assert.doesNotMatch(read("src/components/investor/investor-metrics-reality-dashboard.tsx"), /mvp-stats/i);
});

test("no fake traction patterns in component", () => {
  const component = read("src/components/investor/investor-metrics-reality-dashboard.tsx");
  for (const pattern of INVESTOR_FORBIDDEN_TRACTION_PATTERNS) {
    assert.doesNotMatch(component, pattern, String(pattern));
  }
  assert.doesNotMatch(component, /InvestorMetricsPanel|placementRevenue/i);
});

test("launch stance unchanged in docs and matrices", () => {
  const launch = readFileSync(join(root, "..", "docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md"), "utf8");
  const prod = readFileSync(join(root, "..", "docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md"), "utf8");
  const doc = readFileSync(join(root, "..", "docs/INVESTOR_METRICS_REALITY_DASHBOARD_2026-06-11.md"), "utf8");
  assert.match(launch, /Public launch NO-GO|public \*\*NO-GO\*\*/i);
  assert.match(prod, /NO-GO|NOT LIVE/i);
  assert.match(doc, /NO-GO|no fake traction|external invites/i);
});

test("investorMetrics keys exist for all locales", () => {
  for (const locale of LOCALES) {
    const section = dictionaries[locale].investorMetrics;
    assert.ok(section?.launchStanceNoGo, locale);
    assert.ok(section?.modulesLiveTitle, locale);
  }
});

console.log("investor-metrics-reality-dashboard: ok");
