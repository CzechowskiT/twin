/** P0 route weight inventory — static page presence and safe patterns (no profiling). */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const HEAVY_READINESS_ROUTES = [
  { route: "src/app/dashboard/page.tsx", label: "/dashboard" },
  { route: "src/app/dashboard/calendar/readiness/page.tsx", label: "/dashboard/calendar/readiness" },
  { route: "src/app/dashboard/offer-readiness/page.tsx", label: "/dashboard/offer-readiness" },
  { route: "src/app/dashboard/placement-verification/page.tsx", label: "/dashboard/placement-verification" },
  { route: "src/app/recruiter/daily-cockpit/page.tsx", label: "/recruiter/daily-cockpit" },
  { route: "src/app/company/hiring-command-center/page.tsx", label: "/company/hiring-command-center" },
  { route: "src/app/board/calendar-readiness/page.tsx", label: "/board/calendar-readiness" },
  { route: "src/app/board/placement-verification/page.tsx", label: "/board/placement-verification" },
  { route: "src/app/board/persistence-operations-monitor/page.tsx", label: "/board/persistence-operations-monitor" },
  { route: "src/app/dashboard/hiring-journey/page.tsx", label: "/dashboard/hiring-journey" },
  { route: "src/app/profile/hiring-journey/page.tsx", label: "/profile/hiring-journey" },
  { route: "src/app/recruiter/hiring-journey/page.tsx", label: "/recruiter/hiring-journey" },
  { route: "src/app/company/hiring-journey/page.tsx", label: "/company/hiring-journey" },
  { route: "src/app/board/hiring-journey/page.tsx", label: "/board/hiring-journey" },
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 all heavy readiness routes have page.tsx", () => {
  for (const { route, label } of HEAVY_READINESS_ROUTES) {
    assert.ok(existsSync(join(root, route)), `${label} missing ${route}`);
  }
});

test("2 dashboard uses dynamic for heavy panels", () => {
  const dashboard = read("src/app/dashboard/page.tsx");
  assert.match(dashboard, /dynamic\(/);
});

test("3 placement verification routes lazy-load timeline", () => {
  for (const ws of [
    "src/components/candidate/candidate-placement-verification-preview-workspace.tsx",
    "src/components/board/board-placement-evidence-monitor-workspace.tsx",
  ]) {
    assert.match(read(ws), /dynamic\([\s\S]*placement-events-timeline/);
  }
});

test("4 cockpit/monitor workspaces memoize resolvers", () => {
  for (const ws of [
    "src/components/recruiter/recruiter-daily-operating-cockpit-workspace.tsx",
    "src/components/company/company-hiring-command-center-workspace.tsx",
    "src/components/board/board-persistence-operations-monitor-workspace.tsx",
  ]) {
    assert.match(read(ws), /useMemo\(/);
  }
});

test("5 safe evidence doc lists all inventory routes", () => {
  const doc = readFileSync(join(root, "..", "docs/P0_PERFORMANCE_SAFE_EVIDENCE_2026-06-24.md"), "utf8");
  for (const { label } of HEAVY_READINESS_ROUTES) {
    assert.match(doc, new RegExp(label.replace(/\//g, "\\/")));
  }
});

test("6 hiring journey timeline memoizes demo resolver", () => {
  assert.match(
    read("src/components/hiring-journey/HiringJourneyTimeline.tsx"),
    /useMemo\(\(\) => resolveHiringJourney\(persona\)/,
  );
});

test("7 npm script registered", () => {
  assert.match(read("package.json"), /test:p0-route-weight-inventory/);
});
