import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createRequestDeduper } from "../src/lib/create-request-deduper";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 shared visibility and motion hooks exist", () => {
  const visibility = read("src/hooks/use-page-visibility.ts");
  const motion = read("src/hooks/use-reduced-motion-preference.ts");
  assert.match(visibility, /export function usePageVisibility/);
  assert.match(visibility, /visibilitychange/);
  assert.match(motion, /export function useReducedMotionPreference/);
  assert.match(motion, /prefers-reduced-motion/);
});

test("2 background-aware interval and polling hooks exist", () => {
  const src = read("src/hooks/use-background-aware-interval.ts");
  assert.match(src, /export function useBackgroundAwareInterval/);
  assert.match(src, /export function useBackgroundAwarePolling/);
  assert.match(src, /usePageVisibility/);
  assert.match(src, /pauseWhenHidden/);
  assert.match(src, /document\.hidden/);
});

test("3 abortable fetch hook cleans up on unmount", () => {
  const src = read("src/hooks/use-abortable-fetch.ts");
  assert.match(src, /export function useAbortableFetch/);
  assert.match(src, /AbortController/);
  assert.match(src, /useEffect\(\(\) => \(\) => abort\(\)/);
});

test("4 request deduper coalesces within TTL", async () => {
  let calls = 0;
  const dedupe = createRequestDeduper(60_000);
  const fn = async () => {
    calls += 1;
    return "ok";
  };
  const [a, b] = await Promise.all([dedupe("k", fn), dedupe("k", fn)]);
  assert.equal(a, "ok");
  assert.equal(b, "ok");
  assert.equal(calls, 1);
  const cached = await dedupe("k", fn);
  assert.equal(cached, "ok");
  assert.equal(calls, 1);
});

test("5 public-health client uses deduper", () => {
  const src = read("src/lib/public-health-client.ts");
  assert.match(src, /createRequestDeduper/);
  assert.match(src, /export async function fetchPublicHealthJson/);
  assert.match(src, /\/api\/public-health/);
});

test("6 PageVisibilitySync wired in providers", () => {
  const providers = read("src/components/providers.tsx");
  const sync = read("src/components/page-visibility-sync.tsx");
  assert.match(providers, /PageVisibilitySync/);
  assert.match(sync, /data-page-hidden/);
  assert.match(sync, /data-reduced-motion/);
});

test("7 globals pause marquee and blur when hidden", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /html\[data-page-hidden="true"\] \.marketing-marquee-track/);
  assert.match(css, /animation-play-state: paused/);
  assert.match(css, /html\[data-page-hidden="true"\] \.company-logo-marquee/);
  assert.match(css, /backdrop-filter: none/);
});

test("8 logo marquee respects hidden tab and reduced motion", () => {
  const marquee = read("src/components/marketing/company-logo-marquee.tsx");
  assert.match(marquee, /usePageVisibility/);
  assert.match(marquee, /useReducedMotionPreference/);
  assert.match(marquee, /staticMarquee/);
});

test("9 dashboard scrape polling backs off when hidden", () => {
  const polling = read("src/hooks/dashboard/use-dashboard-polling.ts");
  assert.match(polling, /usePageVisibility/);
  assert.match(polling, /document\.hidden/);
});

test("10 talent radar and digest use abortable fetch", () => {
  const radar = read("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  const digest = read("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");
  assert.match(radar, /useAbortableFetch/);
  assert.match(radar, /fetchAbortable/);
  assert.match(digest, /useAbortableFetch/);
  assert.match(digest, /useMemo\(\(\) => payload\?\.sections/);
});

test("11 company and recruiter talent pool hardened", () => {
  const company = read("src/app/company/talent-pool/company-talent-pool-client.tsx");
  const recruiter = read("src/app/recruiter/talent-pool/recruiter-talent-pool-client.tsx");
  assert.match(company, /useAbortableFetch/);
  assert.match(company, /dynamic\(/);
  assert.match(company, /roleSkillCoverage/);
  assert.match(recruiter, /useAbortableFetch/);
});

test("12 oauth and ops health dedupe public-health reads", () => {
  const oauth = read("src/lib/oauth-auth.ts");
  const ops = read("src/lib/ops-health.ts");
  const investor = read("src/components/investor/investor-metrics-reality-dashboard.tsx");
  assert.match(oauth, /createRequestDeduper/);
  assert.match(oauth, /fetchPublicHealthJson/);
  assert.match(ops, /opsHealthDeduper/);
  assert.match(investor, /fetchPublicHealthJson/);
});

test("13 marketing polls pause in background tabs", () => {
  const waitlist = read("src/lib/waitlist/use-waitlist-stats.ts");
  const founders = read("src/components/marketing/founders-launch-page.tsx");
  const beta = read("src/app/beta/page.tsx");
  assert.match(waitlist, /useBackgroundAwareInterval/);
  assert.match(founders, /useBackgroundAwareInterval/);
  assert.match(beta, /useBackgroundAwareInterval/);
});

test("14 calendar defers interview refresh when tab hidden", () => {
  const calendar = read("src/app/dashboard/calendar/page.tsx");
  assert.match(calendar, /usePageVisibility/);
  assert.match(calendar, /pageHidden/);
});

test("15 nature background skips parallax when hidden", () => {
  const nature = read("src/components/nature-background.tsx");
  assert.match(nature, /usePageVisibility/);
  assert.match(nature, /useReducedMotionPreference/);
});

test("16 package script registers hardening test", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:multi-tab-performance-hardening/);
});
