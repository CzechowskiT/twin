/**
 * Slice 28 — Gate D founder decision checkpoint (static, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const CHECKPOINT = "docs/GATE_D_FOUNDER_DECISION_CHECKPOINT_2026-06-28.md";
const PREFLIGHT = "docs/gate-d-prod-browser-smoke-preflight-2026-06-28.md";
const RESULT_TEMPLATE = "docs/gate-d-prod-browser-smoke-result-template-2026-06-28.md";

const REQUIRED_COMMAND_PARTS = [
  "PLAYWRIGHT_ALLOW_PROD_SMOKE=1",
  "PLAYWRIGHT_SKIP_WEBSERVER=1",
  "PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app",
  "npm run test:p0-no-headless-final-state-browser",
  "--workers=1",
] as const;

const FOUNDER_QUESTION =
  "Do you approve Gate D = YES to run the gated production browser smoke against https://twin-sooty.vercel.app?";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 checkpoint doc exists with correct title", () => {
  const checkpoint = readRepo(CHECKPOINT);
  assert.match(checkpoint, /Gate D Founder Decision Checkpoint/);
});

test("2 purpose — does NOT execute Gate D, approve launch, close P0, or approve Gate E", () => {
  const checkpoint = readRepo(CHECKPOINT);
  const purpose = checkpoint.split("## 1. Purpose")[1]?.split("## 2.")[0] ?? "";
  assert.match(purpose, /does NOT/i);
  assert.match(purpose, /Execute Gate D/i);
  assert.match(purpose, /Approve public launch/i);
  assert.match(purpose, /Close P0/i);
  assert.match(purpose, /Approve Gate E/i);
});

test("3 current status — Gates A-F, Launch NO-GO, P0 OPEN, Phase 3B BLOCKED", () => {
  const checkpoint = readRepo(CHECKPOINT);
  const status = checkpoint.split("## 2. Current Status")[1]?.split("## 3.")[0] ?? "";
  assert.match(status, /\| \*\*A\*\*/);
  assert.match(status, /\| \*\*B\*\*/);
  assert.match(status, /\| \*\*C\*\*/);
  assert.match(status, /\| \*\*D\*\*/);
  assert.match(status, /\| \*\*E\*\*/);
  assert.match(status, /\| \*\*F\*\*/);
  assert.match(status, /NO-GO/i);
  assert.match(status, /P0.*OPEN/i);
  assert.match(status, /Phase 3B.*(HARD BLOCKED|NOT RUN)/i);
});

test("4 founder question — exact wording and YES / NO / PENDING answers", () => {
  const checkpoint = readRepo(CHECKPOINT);
  assert.match(checkpoint, new RegExp(FOUNDER_QUESTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(checkpoint, /Gate D = YES/);
  assert.match(checkpoint, /Gate D = NO \/ PENDING/);
});

test("5 exact Gate D command with env flags and workers=1", () => {
  const checkpoint = readRepo(CHECKPOINT);
  for (const part of REQUIRED_COMMAND_PARTS) {
    assert.match(checkpoint, new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("6 preconditions link gate-d preflight runbook", () => {
  const checkpoint = readRepo(CHECKPOINT);
  assert.match(checkpoint, /gate-d-prod-browser-smoke-preflight-2026-06-28\.md/);
  const preflight = readRepo(PREFLIGHT);
  assert.match(preflight, /Preflight Runbook/);
});

test("7 what Gate D will not do — no Phase 3B, P0 close, launch, Gate E, prod mutations, CI changes", () => {
  const checkpoint = readRepo(CHECKPOINT);
  const section = checkpoint.split("## 6. What Gate D Will Not Do")[1]?.split("## 7.")[0] ?? "";
  assert.match(section, /Phase 3B/i);
  assert.match(section, /P0.*OPEN/i);
  assert.match(section, /NO-GO/i);
  assert.match(section, /Gate E/i);
  assert.match(section, /Mutate production|Read-only/i);
  assert.match(section, /smoke\.yml|CI browser/i);
});

test("8 after PASS — result template, evidence index, Gate E separate; no overclaims", () => {
  const checkpoint = readRepo(CHECKPOINT);
  const afterPass = checkpoint.split("## 7. After PASS")[1]?.split("## 8.")[0] ?? "";
  assert.match(afterPass, /gate-d-prod-browser-smoke-result-template-2026-06-28\.md/);
  assert.match(afterPass, /LAUNCH_READINESS_EVIDENCE_INDEX/);
  assert.match(afterPass, /P0.*OPEN/i);
  assert.match(afterPass, /NO-GO/i);
  assert.match(afterPass, /Gate E.*separate/i);
});

test("9 after FAIL — stop, categorize, fix branch, no Gate E, no P0 close", () => {
  const checkpoint = readRepo(CHECKPOINT);
  const afterFail = checkpoint.split("## 8. After FAIL")[1]?.split("## Explicit")[0] ?? "";
  assert.match(afterFail, /Stop/i);
  assert.match(afterFail, /Categorize/i);
  assert.match(afterFail, /fix branch/i);
  assert.match(afterFail, /No Gate E/i);
  assert.match(afterFail, /No P0 close/i);
});

test("10 checkpoint — Gate D PENDING, no execution, no overclaims", () => {
  const checkpoint = readRepo(CHECKPOINT);
  assert.match(checkpoint, /Gate D.*PENDING/i);
  assert.match(checkpoint, /NOT EXECUTED|not executed|must not run/i);
  assert.match(checkpoint, /NO-GO/i);
  assert.match(checkpoint, /P0.*OPEN/i);
  assert.match(checkpoint, /Phase 3B.*(HARD BLOCKED|NOT RUN)/i);
  assert.doesNotMatch(checkpoint, /\| \*\*Gate D\*\* \|.*\*\*PASS\*\*/i);
  assert.doesNotMatch(checkpoint, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(checkpoint, /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/);
});

test("11 npm script test:gate-d-founder-decision-checkpoint registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-d-founder-decision-checkpoint/);
  assert.match(pkg, /gate-d-founder-decision-checkpoint\.test\.ts/);
});

test("12 result template remains template-only with no execution recorded", () => {
  const template = readRepo(RESULT_TEMPLATE);
  assert.match(template, /Template only/i);
  assert.match(template, /no Gate D execution recorded/i);
  assert.match(template, /Gate D remains PENDING/i);
});
