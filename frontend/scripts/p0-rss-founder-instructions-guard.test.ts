/**
 * P0 RSS smoke founder instructions — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const FOUNDER_INSTRUCTIONS = "docs/P0_RSS_SMOKE_FOUNDER_INSTRUCTIONS_2026-07-07.md";
const EVIDENCE_TEMPLATE = "docs/P0_RSS_SMOKE_EVIDENCE_TEMPLATE_2026-07-07.md";
const CLOSURE_DECISION_TEMPLATE = "docs/P0_CLOSURE_DECISION_TEMPLATE_2026-07-07.md";

const TEN_TAB_ROUTES = [
  "/",
  "/demo",
  "/for-companies",
  "/dashboard",
  "/dashboard/jobs",
  "/dashboard/matches",
  "/profile",
  "/recruiter",
  "/company/dashboard",
  "/company/candidates/demo-candidate-001",
] as const;

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function founderDoc(): string {
  return readRepo(FOUNDER_INSTRUCTIONS);
}

test("1 founder instructions doc exists", () => {
  const doc = founderDoc();
  assert.match(doc, /P0 RSS Smoke — Founder Instructions/);
});

test("2 founder instructions — contains 10-tab plan with all routes", () => {
  const doc = founderDoc();
  assert.match(doc, /10-tab plan|10 kart/i);
  for (const route of TEN_TAB_ROUTES) {
    assert.match(doc, new RegExp(route.replace(/\//g, "\\/")));
  }
});

test("3 founder instructions — includes Activity Monitor evidence", () => {
  const doc = founderDoc();
  assert.match(doc, /Activity Monitor/i);
  assert.match(doc, /baseline/i);
  assert.match(doc, /4–6 min|4-6 min/i);
});

test("4 founder instructions — includes PASS FAIL ABORT outcomes", () => {
  const doc = founderDoc();
  assert.match(doc, /PASS/);
  assert.match(doc, /FAIL/);
  assert.match(doc, /ABORT/);
});

test("5 founder instructions — says not Launch GO", () => {
  const doc = founderDoc();
  assert.match(doc, /not Launch GO|nie.*Launch GO|Launch GO/i);
  assert.match(doc, /No Launch GO|nie jest Launch GO/i);
});

test("6 founder instructions — says not Gate F YES", () => {
  const doc = founderDoc();
  assert.match(doc, /not Gate F YES|nie jest Gate F YES|Gate F YES/i);
  assert.match(doc, /No Gate F YES/i);
});

test("7 founder instructions — says not automatic P0 closure", () => {
  const doc = founderDoc();
  assert.match(doc, /not automatic P0 closure|nie zamyka P0 automatycznie|automatic P0 closure/i);
  assert.match(doc, /bez osobnej decyzji foundera|without.*founder decision/i);
});

test("8 founder instructions — includes abort criteria", () => {
  const doc = founderDoc();
  assert.match(doc, /Abort criteria|Kryteria ABORT/i);
  assert.match(doc, /force quit|force-quit/i);
  assert.match(doc, /runaway|niestabilny|unstable/i);
});

test("9 founder instructions — references evidence template", () => {
  const doc = founderDoc();
  assert.match(doc, /P0_RSS_SMOKE_EVIDENCE_TEMPLATE_2026-07-07\.md/);
  assert.match(doc, /Evidence Template|szablon dowodów/i);
  assert.ok(readRepo(EVIDENCE_TEMPLATE).length > 0);
});

test("10 founder instructions — references closure decision template", () => {
  const doc = founderDoc();
  assert.match(doc, /P0_CLOSURE_DECISION_TEMPLATE_2026-07-07\.md/);
  assert.match(doc, /Closure Decision Template|szablon closure/i);
  assert.ok(readRepo(CLOSURE_DECISION_TEMPLATE).length > 0);
});

test("11 founder instructions — 8-12 tabs and RSS responsiveness scope", () => {
  const doc = founderDoc();
  assert.match(doc, /8–12|8-12/);
  assert.match(doc, /RSS/i);
  assert.match(doc, /responsywn|responsive/i);
});

test("12 npm script test:p0-rss-founder-instructions-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:p0-rss-founder-instructions-guard":/);
  assert.match(pkgJson, /p0-rss-founder-instructions-guard\.test\.ts/);
});
