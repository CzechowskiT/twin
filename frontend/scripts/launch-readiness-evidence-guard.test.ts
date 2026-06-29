/**
 * Slice 25 — launch readiness evidence index + founder demo checklist (static, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";
const FOUNDER_CHECKLIST = "docs/FOUNDER_DEMO_CHECKLIST_2026-06-28.md";

const DEMO_PATH_ROUTES = [
  "/",
  "/#explore-twin",
  "/for-investors",
  "/investor",
  "/investor/product-proof",
  "/demo",
  "/how-it-works",
  "/faq",
  "/dashboard/trust",
  "/status",
] as const;

const REQUIRED_SOURCE_DOCS = [
  "gate-c-browser-validation-result-2026-06-28.md",
  "gate-d-prod-browser-smoke-decision-2026-06-28.md",
  "gate-e-phase3b-prerequisites-decision-2026-06-28.md",
  "TWIN_PUBLIC_LAUNCH_READINESS_PLAN_2026-06-27.md",
  "TWIN_OPERATING_CONTEXT_2026-06-26.md",
] as const;

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 evidence index and founder checklist docs exist", () => {
  const index = readRepo(EVIDENCE_INDEX);
  const checklist = readRepo(FOUNDER_CHECKLIST);
  assert.match(index, /Launch Readiness Evidence Index/);
  assert.match(checklist, /Founder Demo Checklist/);
});

test("2 evidence index — Launch NO-GO, P0 OPEN, Gate D/E PENDING, Phase 3B not run", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.match(index, /Gate D.*PENDING/i);
  assert.match(index, /Gate E.*PENDING/i);
  assert.match(index, /Phase 3B.*(NOT RUN|HARD BLOCKED|not run)/i);
});

test("3 evidence index — no launch approval or P0 closed or Phase 3B passed claims", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.doesNotMatch(index, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(index, /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(index, /launch approved/i);
});

test("4 founder demo checklist — all demo path routes present", () => {
  const checklist = readRepo(FOUNDER_CHECKLIST);
  for (const route of DEMO_PATH_ROUTES) {
    const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(checklist, new RegExp(escaped));
  }
});

test("5 founder demo checklist — What Not To Say section lists forbidden live claims", () => {
  const checklist = readRepo(FOUNDER_CHECKLIST);
  assert.match(checklist, /What Not To Say/i);
  const section = checklist.split("## 5. What Not To Say")[1]?.split("## 6.")[0] ?? "";
  assert.match(section, /launch-ready|production-ready/i);
  assert.match(section, /P0 closed/i);
  assert.match(section, /Phase 3B passed/i);
  assert.match(section, /live ATS|ATS writeback/i);
  assert.match(section, /outreach/i);
  assert.match(section, /calendar write/i);
  assert.match(section, /payment|revenue/i);
  assert.match(section, /placement confirmed/i);
});

test("6 evidence index — source docs list includes gate C/D/E, launch plan, operating context", () => {
  const index = readRepo(EVIDENCE_INDEX);
  const sourceSection = index.split("## 10. Source Documents")[1] ?? index;
  for (const doc of REQUIRED_SOURCE_DOCS) {
    assert.match(sourceSection, new RegExp(doc.replace(".", "\\.")));
  }
});

test("7 evidence index links founder demo checklist", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /FOUNDER_DEMO_CHECKLIST_2026-06-28\.md/);
});

test("8 LAUNCH_STANCE remains noGo in code", () => {
  const launchStance = readFileSync(join(root, "src/lib/investor-metrics-reality.ts"), "utf8");
  assert.match(launchStance, /LAUNCH_STANCE\s*=\s*"noGo"/);
});
