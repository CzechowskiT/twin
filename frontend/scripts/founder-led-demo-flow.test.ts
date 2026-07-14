/**
 * Founder-led demo flow — static route, link, and hard-ban guards (12 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  collectFounderLedDemoHrefs,
  FOUNDER_LED_DEMO_EXTENDED_ROUTES,
  FOUNDER_LED_DEMO_ROLE_ENTRIES,
  FOUNDER_LED_BOUNDARY_KEYS,
  resolveFounderLedDemoHref,
} from "../src/lib/founder-led-demo-routes";
import { en, dictionaries } from "../src/lib/i18n";
import { headerMarketingLaneLinks } from "../src/lib/persona-access";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(root, "src/app");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

const FORBIDDEN_COPY = [
  /\bauto-apply is live\b/i,
  /\bdelegated apply is live\b/i,
  /\bapplies automatically\b/i,
  /\bauto-outreach is live\b/i,
  /\bwe message candidates automatically\b/i,
];

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function normalizeHref(href: string): string {
  const raw = href.split("#")[0]?.split("?")[0] ?? "/";
  if (raw.length > 1 && raw.endsWith("/")) return raw.slice(0, -1);
  return raw || "/";
}

function routePageExists(pathname: string): boolean {
  const base = normalizeHref(pathname);
  if (!base.startsWith("/")) return true;

  function findPage(dir: string, segments: readonly string[]): boolean {
    if (segments.length === 0) {
      if (existsSync(join(dir, "page.tsx"))) return true;
      if (!existsSync(dir)) return false;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        if (name.startsWith("(") && name.endsWith(")")) {
          if (existsSync(join(dir, name, "page.tsx"))) return true;
        }
      }
      return false;
    }
    if (!existsSync(dir)) return false;
    const [head, ...rest] = segments;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      const child = join(dir, name);
      if (name.startsWith("(") && name.endsWith(")")) {
        if (findPage(child, segments)) return true;
      } else if (name === head) {
        if (findPage(child, rest)) return true;
      } else if (name.startsWith("[") && name.endsWith("]")) {
        if (findPage(child, rest)) return true;
      }
    }
    return false;
  }

  return findPage(appRoot, base === "/" ? [] : base.split("/").filter(Boolean));
}

test("1 /demo route page exists", () => {
  assert.ok(existsSync(join(appRoot, "(marketing)", "demo", "page.tsx")));
});

test("2 /demo page renders hero and below-fold journey", () => {
  const page = read("src/app/(marketing)/demo/page.tsx");
  assert.match(page, /FounderLedDemoHero/);
  assert.match(page, /FounderLedDemoBelowFold/);
  const flow = read("src/components/marketing/founder-led-demo-flow.tsx");
  assert.match(flow, /data-founder-led-demo="hero"/);
  assert.match(flow, /data-founder-led-demo="journey"/);
  assert.match(flow, /founderLedDemo\.pageTitle/);
  assert.ok(en.founderLedDemo.pageTitle.length > 10);
  assert.ok(en.founderLedDemo.closingStatement.includes("auto-apply"));
});

test("3 /demo hero launch CTA scrolls to interactive player", () => {
  const flow = read("src/components/marketing/founder-led-demo-flow.tsx");
  assert.match(flow, /data-founder-led-demo-cta="launch"/);
  assert.match(flow, /heroCtaLaunch/);
  assert.match(flow, /interactive-story/);
  assert.ok(en.founderLedDemo.heroCtaLaunch.length > 3);
});

test("4 /demo role entries include recruiter cockpit path", () => {
  const recruiter = FOUNDER_LED_DEMO_ROLE_ENTRIES.find((r) => r.id === "role_recruiter");
  assert.ok(recruiter);
  assert.equal(normalizeHref(recruiter.href), "/recruiter");
  const resolved = resolveFounderLedDemoHref(recruiter);
  assert.match(resolved, /next=%2Frecruiter/);
});

test("5 /demo role entries include candidate view path", () => {
  const candidate = FOUNDER_LED_DEMO_ROLE_ENTRIES.find((r) => r.id === "role_candidate");
  assert.ok(candidate);
  assert.equal(normalizeHref(candidate.href), "/dashboard");
  const resolved = resolveFounderLedDemoHref(candidate);
  assert.match(resolved, /next=%2Fdashboard/);
});

test("6 all visible founder-led demo links resolve to existing routes or auth login", () => {
  for (const href of collectFounderLedDemoHrefs()) {
    if (href.startsWith("/login")) {
      assert.match(href, /\/login/);
      continue;
    }
    assert.ok(routePageExists(href), `missing route for demo link: ${href}`);
  }
});

test("7 homepage marketing chrome has visible Demo link", () => {
  const links = headerMarketingLaneLinks();
  const demo = links.find((l) => l.labelKey === "nav.demo");
  assert.ok(demo, "nav.demo missing from headerMarketingLaneLinks");
});

test("8 homepage Demo button points to /demo", () => {
  const links = headerMarketingLaneLinks();
  const demo = links.find((l) => l.labelKey === "nav.demo");
  assert.ok(demo);
  assert.equal(normalizeHref(demo.href), "/demo");
});

test("9 extended founder-led demo inventory has no 404 targets", () => {
  for (const path of FOUNDER_LED_DEMO_EXTENDED_ROUTES) {
    assert.ok(routePageExists(path), `extended demo route missing: ${path}`);
  }
});

test("10 founder-led demo copy has no hard-ban regression", () => {
  const blob = JSON.stringify({ en: en.founderLedDemo, pl: dictionaries.pl.founderLedDemo });
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in founderLedDemo copy`);
  }
  assert.match(en.founderLedDemo.closingStatement.toLowerCase(), /not auto-apply|nie auto-apply/);
  for (const key of FOUNDER_LED_BOUNDARY_KEYS) {
    const field = key.replace("founderLedDemo.", "") as keyof typeof en.founderLedDemo;
    assert.ok(en.founderLedDemo[field]?.length);
  }
});

test("11 founder-led demo states no auto-apply or auto-outreach activation", () => {
  const copy = JSON.stringify(en.founderLedDemo).toLowerCase();
  assert.match(copy, /paused|no automatic|not auto-apply|not auto-outreach/);
  assert.doesNotMatch(copy, /auto-apply is live/);
  assert.doesNotMatch(copy, /auto-outreach is live/);
});

test("12 shell/gate/fallback/layout files not modified by founder-led demo feature files", () => {
  const featurePaths = [
    "src/lib/founder-led-demo-routes.ts",
    "src/components/marketing/founder-led-demo-flow.tsx",
    "src/app/(marketing)/demo/page.tsx",
  ];
  const featureBlob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(featureBlob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(featureBlob, /LightweightRouteShell/);
  assert.doesNotMatch(featureBlob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(featureBlob, /WorkspaceRouteLayout/);
});
