/** P0 performance guardrails — static checks only (no browser profiling). */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 P0 inventory doc exists and marks P0 OPEN", () => {
  const doc = readRepo("docs/P0_PERFORMANCE_INVENTORY_2026-06-21.md");
  assert.match(doc, /P0 performance remains OPEN/i);
  assert.match(doc, /Phase 3B.*HARD BLOCKED/i);
});

test("2 no full 89-logo marquee on workspace safe path", () => {
  const marquee = read("src/components/site-top-marquee.tsx");
  assert.match(marquee, /PerformanceSafeMovingLogoMarquee/);
  assert.doesNotMatch(marquee, /import \{ CompanyLogoMarquee \}/);
});

test("3 moving logo remains performance-safe component", () => {
  const safe = read("src/components/marketing/performance-safe-moving-logo-marquee.tsx");
  assert.match(safe, /PERFORMANCE_SAFE_MARQUEE_BRANDS/);
  assert.match(safe, /performance-safe-marquee-track/);
});

test("4 guardrails npm script uses tsx static runner only", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:p0-performance-guardrails": "npx --yes tsx scripts\/p0-performance-guardrails.test.ts"/);
});

test("5 guardrails batch did not add new stress npm scripts", () => {
  const pkg = read("package.json");
  const added = pkg.match(/test:p0-performance-guardrails/);
  assert.ok(added);
  assert.doesNotMatch(pkg, /test:p0-browser-stress/);
});

test("6 placement timeline has no polling loop", () => {
  const timeline = read("src/components/shared/placement-events-timeline.tsx");
  assert.doesNotMatch(timeline, /setInterval/);
  assert.doesNotMatch(timeline, /poll/i);
});

test("7 cockpit routes memoize static demo data", () => {
  const recruiter = read("src/components/recruiter/recruiter-daily-operating-cockpit-workspace.tsx");
  const company = read("src/components/company/company-hiring-command-center-workspace.tsx");
  const board = read("src/components/board/board-persistence-operations-monitor-workspace.tsx");
  assert.match(recruiter, /useMemo\(\(\) => resolveRecruiterDailyCockpit\(\)/);
  assert.match(company, /useMemo\(\(\) => resolveCompanyHiringCommandCenter\(\)/);
  assert.match(board, /useMemo\(\(\) => resolveBoardPersistenceOperationsMonitor\(\)/);
});

test("8 npm script registered", () => {
  assert.match(read("package.json"), /test:p0-performance-guardrails/);
});
