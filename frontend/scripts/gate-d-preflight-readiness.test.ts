/**
 * Slice 26 — Gate D preflight readiness (static, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const PREFLIGHT = "docs/gate-d-prod-browser-smoke-preflight-2026-06-28.md";
const RESULT_TEMPLATE = "docs/gate-d-prod-browser-smoke-result-template-2026-06-28.md";
const GATE_D_DECISION = "docs/gate-d-prod-browser-smoke-decision-2026-06-28.md";
const GATE_D_CHECKPOINT = "docs/GATE_D_FOUNDER_DECISION_CHECKPOINT_2026-06-28.md";
const GATE_E = "docs/gate-e-phase3b-prerequisites-decision-2026-06-28.md";

const REQUIRED_COMMAND_PARTS = [
  "PLAYWRIGHT_ALLOW_PROD_SMOKE=1",
  "PLAYWRIGHT_SKIP_WEBSERVER=1",
  "PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app",
  "npm run test:p0-no-headless-final-state-browser",
  "--workers=1",
] as const;

const FAILURE_TAXONOMY = ["A", "B", "C", "D", "E", "F", "G", "H", "I"] as const;

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 preflight and result template docs exist", () => {
  const preflight = readRepo(PREFLIGHT);
  const template = readRepo(RESULT_TEMPLATE);
  assert.match(preflight, /Gate D Production Browser Smoke — Preflight Runbook/);
  assert.match(template, /Gate D Production Browser Smoke — Result Template/);
});

test("2 preflight doc — required Gate D command with env flags and workers=1", () => {
  const preflight = readRepo(PREFLIGHT);
  for (const part of REQUIRED_COMMAND_PARTS) {
    assert.match(preflight, new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("3 preflight doc — Gate D PENDING, not execution approval, no overclaims", () => {
  const preflight = readRepo(PREFLIGHT);
  assert.match(preflight, /Gate D.*PENDING/i);
  assert.match(preflight, /not execution approval|runbook only/i);
  assert.match(preflight, /no prod browser smoke|NOT RUN/i);
  assert.match(preflight, /Phase 3B.*HARD BLOCKED/i);
  assert.match(preflight, /P0.*OPEN/i);
  assert.match(preflight, /NO-GO/i);
  assert.doesNotMatch(preflight, /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/);
  assert.doesNotMatch(preflight, /Launch stance:\s*\*\*GO\*\*/i);
});

test("4 preflight doc — failure taxonomy A–I and After PASS non-claims", () => {
  const preflight = readRepo(PREFLIGHT);
  for (const code of FAILURE_TAXONOMY) {
    assert.match(preflight, new RegExp(`\\*\\*${code}\\*\\*`));
  }
  const afterPass = preflight.split("## 9. After PASS")[1]?.split("## 10.")[0] ?? "";
  assert.match(afterPass, /P0.*OPEN/i);
  assert.match(afterPass, /NO-GO/i);
  assert.match(afterPass, /does \*\*not\*\* set Gate E = YES|does \*\*not\*\* auto-unblock/i);
});

test("5 result template — template only, no execution, forbidden claims", () => {
  const template = readRepo(RESULT_TEMPLATE);
  assert.match(template, /Template only/i);
  assert.match(template, /no Gate D execution recorded/i);
  assert.match(template, /Gate D remains PENDING/i);
  assert.match(template, /No public launch.*GO/i);
  assert.match(template, /No P0.*CLOSED/i);
  assert.match(template, /No Phase 3B.*PASS/i);
  for (const part of REQUIRED_COMMAND_PARTS) {
    assert.match(template, new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("6 Gate E still requires Gate D PASS; smoke.yml has no Playwright", () => {
  const gateE = readRepo(GATE_E);
  assert.match(gateE, /Gate D.*PASS/i);
  assert.match(gateE, /does NOT approve Gate E/i);

  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /p0-no-headless-final-state-browser/);
});

test("7 npm script test:gate-d-preflight-readiness registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-d-preflight-readiness/);
  assert.match(pkg, /gate-d-preflight-readiness\.test\.ts/);
});

test("8 gate-d decision links preflight and result template", () => {
  const gateD = readRepo(GATE_D_DECISION);
  assert.match(gateD, /gate-d-prod-browser-smoke-preflight-2026-06-28\.md/);
  assert.match(gateD, /gate-d-prod-browser-smoke-result-template-2026-06-28\.md/);
});

test("9 preflight and checkpoint cross-reference; command unchanged; no execution recorded", () => {
  const preflight = readRepo(PREFLIGHT);
  const checkpoint = readRepo(GATE_D_CHECKPOINT);
  assert.match(preflight, /gate-d-prod-browser-smoke-preflight-2026-06-28\.md/);
  assert.match(checkpoint, /gate-d-prod-browser-smoke-preflight-2026-06-28\.md/);
  assert.match(checkpoint, /GATE_D_FOUNDER_DECISION_CHECKPOINT_2026-06-28\.md/);
  for (const part of REQUIRED_COMMAND_PARTS) {
    assert.match(preflight, new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(checkpoint, new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(preflight, /NOT RUN|not executed/i);
  assert.match(checkpoint, /NOT EXECUTED|not executed|must not run/i);
  const template = readRepo(RESULT_TEMPLATE);
  assert.match(template, /Template only/i);
  assert.match(template, /no Gate D execution recorded/i);
});
