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
  "gate-d-prod-browser-smoke-preflight-2026-06-28.md",
  "gate-d-prod-browser-smoke-result-2026-06-28.md",
  "gate-d-prod-browser-smoke-result-template-2026-06-28.md",
  "GATE_D_FOUNDER_DECISION_CHECKPOINT_2026-06-28.md",
  "GATE_E_FOUNDER_DECISION_PACKAGE_2026-06-28.md",
  "gate-e-phase3b-prerequisites-decision-2026-06-28.md",
  "gate-e-phase3b-result-template-2026-06-28.md",
  "gate-e-phase3b-result-2026-06-28.md",
  "gate-e-phase3b-attempt-1-aborted-resource-safety-2026-06-28.md",
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

test("2 evidence index — Launch NO-GO, P0 OPEN, Gate D YES prod PASS, Gate E YES FAIL, Phase 3B FAIL", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.match(index, /Gate D.*YES/i);
  assert.match(index, /36\/36 PASS/i);
  assert.match(index, /Gate E.*YES/i);
  assert.match(index, /Phase 3B.*FAIL/i);
  assert.match(index, /0\/20/i);
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

test("9 evidence index references Gate D preflight and Gate D prod result", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /gate-d-prod-browser-smoke-preflight-2026-06-28\.md/);
  assert.match(index, /gate-d-prod-browser-smoke-result-2026-06-28\.md/);
  assert.match(index, /Gate D.*YES/i);
  assert.match(index, /Gate E.*YES/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
});

test("10 evidence index references Gate D result template or result process", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /gate-d-prod-browser-smoke-result-template-2026-06-28\.md/);
  assert.match(index, /result template|fill.*template/i);
});

test("11 evidence index references Gate D prod result — not Phase 3B PASS", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /gate-d-prod-browser-smoke-result-2026-06-28\.md/);
  assert.match(index, /Gate D.*YES/i);
  assert.match(index, /Gate E.*YES/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
});

test("12 evidence index references Gate D founder decision checkpoint", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /GATE_D_FOUNDER_DECISION_CHECKPOINT_2026-06-28\.md/);
  assert.match(index, /Gate D.*YES/i);
  assert.match(index, /Gate E.*YES/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
});

test("13 evidence index references readiness consistency lock guard", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /test:readiness-consistency-lock/);
  assert.match(index, /readiness-consistency-lock/);
  assert.match(index, /Gate D.*YES/i);
  assert.match(index, /Gate E.*YES/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
});

test("14 evidence index references gate D prod browser smoke result guard", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /test:gate-d-prod-browser-smoke-result/);
  assert.match(index, /gate-d-prod-browser-smoke-result/);
  assert.match(index, /Gate D.*YES/i);
  assert.match(index, /Gate E.*YES/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
});

test("15 evidence index references Gate E founder decision package", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /GATE_E_FOUNDER_DECISION_PACKAGE_2026-06-28\.md/);
  assert.match(index, /test:gate-e-founder-decision-package/);
  assert.match(index, /Gate D.*YES/i);
  assert.match(index, /Gate E.*YES/i);
  assert.match(index, /Phase 3B.*FAIL/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
});

test("16 evidence index references gate E phase3b result guard", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /test:gate-e-phase3b-result/);
  assert.match(index, /gate-e-phase3b-result-2026-06-28/);
  assert.match(index, /Gate E.*YES/i);
  assert.match(index, /Phase 3B.*FAIL/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
});
