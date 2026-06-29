/**
 * Slice 29 — readiness decision consistency lock (static, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const GATE_D_DECISION = "docs/gate-d-prod-browser-smoke-decision-2026-06-28.md";
const GATE_D_PREFLIGHT = "docs/gate-d-prod-browser-smoke-preflight-2026-06-28.md";
const GATE_D_CHECKPOINT = "docs/GATE_D_FOUNDER_DECISION_CHECKPOINT_2026-06-28.md";
const GATE_D_PROMPT = "docs/GATE_D_FOUNDER_DECISION_PROMPT_2026-06-28.md";
const GATE_D_RESULT = "docs/gate-d-prod-browser-smoke-result-template-2026-06-28.md";
const GATE_D_RESULT_EXECUTED = "docs/gate-d-prod-browser-smoke-result-2026-06-28.md";
const GATE_E = "docs/gate-e-phase3b-prerequisites-decision-2026-06-28.md";
const GATE_E_PACKAGE = "docs/GATE_E_FOUNDER_DECISION_PACKAGE_2026-06-28.md";
const GATE_E_RESULT_TEMPLATE = "docs/gate-e-phase3b-result-template-2026-06-28.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";
const SLICE12 = "docs/SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md";
const FOUNDER_DEMO = "docs/FOUNDER_DEMO_CHECKLIST_2026-06-28.md";
const P0_SHELL_REVIEW = "docs/P0_SHELL_FOUNDER_REVIEW_2026-06-28.md";
const GATE_C_RESULT = "docs/gate-c-browser-validation-result-2026-06-28.md";
const LAUNCH_PLAN = "docs/TWIN_PUBLIC_LAUNCH_READINESS_PLAN_2026-06-27.md";
const OPERATING_CONTEXT = "docs/TWIN_OPERATING_CONTEXT_2026-06-26.md";
const FEATURE_AUDIT = "docs/TWIN_FEATURE_STATUS_AUDIT_2026-06-27.md";

const KEY_DOCS = [
  GATE_D_DECISION,
  GATE_D_PREFLIGHT,
  GATE_D_CHECKPOINT,
  GATE_D_PROMPT,
  GATE_D_RESULT,
  GATE_D_RESULT_EXECUTED,
  GATE_E,
  GATE_E_PACKAGE,
  GATE_E_RESULT_TEMPLATE,
  EVIDENCE_INDEX,
  SLICE12,
  FOUNDER_DEMO,
  P0_SHELL_REVIEW,
  GATE_C_RESULT,
  LAUNCH_PLAN,
  OPERATING_CONTEXT,
  FEATURE_AUDIT,
] as const;

const HISTORICAL_PACKAGE_DOCS = [
  GATE_D_DECISION,
  GATE_D_PREFLIGHT,
  GATE_D_CHECKPOINT,
  GATE_D_PROMPT,
] as const;

const POST_PASS_STANCE_DOCS = [
  GATE_E,
  GATE_E_PACKAGE,
  EVIDENCE_INDEX,
  SLICE12,
  FOUNDER_DEMO,
  P0_SHELL_REVIEW,
] as const;

const DECISION_DOCS = [
  ...HISTORICAL_PACKAGE_DOCS,
  ...POST_PASS_STANCE_DOCS,
] as const;

const GATE_D_COMMAND_DOCS = [
  GATE_D_DECISION,
  GATE_D_PREFLIGHT,
  GATE_D_CHECKPOINT,
  GATE_D_RESULT,
] as const;

const REQUIRED_COMMAND_PARTS = [
  "PLAYWRIGHT_ALLOW_PROD_SMOKE=1",
  "PLAYWRIGHT_SKIP_WEBSERVER=1",
  "PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app",
  "npm run test:p0-no-headless-final-state-browser",
  "--workers=1",
] as const;

const CANONICAL_GATE_D_COMMAND =
  "cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:p0-no-headless-final-state-browser -- --workers=1";

const FOUNDER_QUESTION =
  "Do you approve Gate D = YES to run the gated production browser smoke against https://twin-sooty.vercel.app?";

const FORBIDDEN_STATUS_PATTERNS = [
  /Launch stance:\s*\*\*GO\*\*/i,
  /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/,
  /\| \*\*Gate D\*\* \|.*\*\*PASS\*\*/i,
  /\| \*\*Gate E\*\* \|.*\*\*YES\*\*/i,
  /\| \*\*Phase 3B\*\* \|.*\*\*PASS\*\*/i,
  /launch approved/i,
  /prod browser smoke executed.*\*\*PASS\*\*/i,
] as const;

const GATE_D_COMMAND_RE =
  /cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https:\/\/twin-sooty\.vercel\.app npm run test:p0-no-headless-final-state-browser -- --workers=1/g;

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function normalizeCommand(text: string): string {
  return text
    .replace(/\\\s*\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractGateDCommands(doc: string): string[] {
  return doc.match(GATE_D_COMMAND_RE) ?? [];
}

test("1 all key readiness docs exist", () => {
  for (const doc of KEY_DOCS) {
    const content = readRepo(doc);
    assert.ok(content.length > 0, `${doc} must not be empty`);
  }
});

test("2 decision docs — Launch NO-GO, P0 OPEN, Gate E PENDING, Phase 3B blocked", () => {
  for (const doc of DECISION_DOCS) {
    const content = readRepo(doc);
    assert.match(content, /NO-GO/i, `${doc}: missing NO-GO`);
    assert.match(content, /P0.*OPEN/i, `${doc}: missing P0 OPEN`);
    assert.match(content, /Gate E.*PENDING/i, `${doc}: missing Gate E PENDING`);
    assert.match(
      content,
      /Phase 3B.*(NOT RUN|HARD BLOCKED|not run)/i,
      `${doc}: missing Phase 3B blocked`,
    );
  }
  for (const doc of HISTORICAL_PACKAGE_DOCS) {
    const content = readRepo(doc);
    assert.match(content, /Gate D.*PENDING/i, `${doc}: historical package should remain PENDING`);
  }
  for (const doc of POST_PASS_STANCE_DOCS) {
    const content = readRepo(doc);
    assert.match(content, /Gate D.*YES/i, `${doc}: missing Gate D YES after prod PASS`);
  }
});

test("3 decision docs — no forbidden launch/gate overclaims", () => {
  for (const doc of DECISION_DOCS) {
    const content = readRepo(doc);
    for (const pattern of FORBIDDEN_STATUS_PATTERNS) {
      assert.doesNotMatch(content, pattern, `${doc}: forbidden claim ${pattern}`);
    }
  }
});

test("4 gate D checkpoint — exact founder question and YES / NO / PENDING answers", () => {
  const checkpoint = readRepo(GATE_D_CHECKPOINT);
  assert.match(
    checkpoint,
    new RegExp(FOUNDER_QUESTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(checkpoint, /Gate D = YES/);
  assert.match(checkpoint, /Gate D = NO \/ PENDING/);
});

test("5 gate D command — required parts in all command-bearing docs", () => {
  for (const doc of GATE_D_COMMAND_DOCS) {
    const content = readRepo(doc);
    for (const part of REQUIRED_COMMAND_PARTS) {
      assert.match(content, new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${doc}`);
    }
  }
});

test("6 gate D command — identical canonical one-liner across decision/preflight/checkpoint/result", () => {
  for (const doc of GATE_D_COMMAND_DOCS) {
    const commands = extractGateDCommands(readRepo(doc));
    assert.ok(commands.length > 0, `${doc}: canonical Gate D command missing`);
    for (const cmd of commands) {
      assert.equal(cmd, CANONICAL_GATE_D_COMMAND, `${doc}: command drift`);
    }
  }
});

test("7 gate E — requires Gate D PASS or founder override; does not approve Gate E", () => {
  const gateE = readRepo(GATE_E);
  assert.match(gateE, /Gate D.*PASS/i);
  assert.match(gateE, /override/i);
  assert.match(gateE, /does NOT approve Gate E/i);
  assert.match(gateE, /Gate E.*PENDING/i);
});

test("8 smoke.yml — no Playwright or default prod browser", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /p0-no-headless-final-state-browser/);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("9 package.json — prod browser not default; browser scripts gated", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:e2e.*DISABLED/i);
  assert.match(pkg, /test:p0-no-headless-final-state-browser/);
  assert.match(pkg, /PLAYWRIGHT_ALLOW_PROD_SMOKE/);
  assert.match(pkg, /PLAYWRIGHT_ENABLE_BROWSER_TESTS/);
  assert.doesNotMatch(pkg, /"test":\s*"playwright test"/);
  assert.doesNotMatch(pkg, /"ci":\s*"[^"]*p0-no-headless-final-state-browser/);
});

test("10 gate D result template — template only, Gate D remains PENDING", () => {
  const template = readRepo(GATE_D_RESULT);
  assert.match(template, /Template only/i);
  assert.match(template, /no Gate D execution recorded/i);
  assert.match(template, /Gate D remains PENDING/i);
});

test("11 npm script test:readiness-consistency-lock registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:readiness-consistency-lock/);
  assert.match(pkg, /readiness-consistency-lock\.test\.ts/);
});

test("12 evidence index references readiness consistency lock guard", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /test:readiness-consistency-lock/);
  assert.match(index, /readiness-consistency-lock/);
  assert.match(index, /Gate D.*YES/i);
  assert.match(index, /Gate E.*PENDING/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
});

test("13 gate D founder decision prompt exists — historical PENDING package", () => {
  const prompt = readRepo(GATE_D_PROMPT);
  assert.match(prompt, /Gate D Founder Decision Prompt/);
  assert.match(prompt, /Gate D.*PENDING/i);
  assert.match(prompt, /NOT TO RUN/i);
  assert.match(prompt, /NOT EXECUTED|not executed|must not run/i);
  assert.doesNotMatch(prompt, /\| \*\*Gate D\*\* \|.*\*\*PASS\*\*/i);
});

test("14 executed result doc claims Gate D PASS; template remains PENDING", () => {
  const resultExecuted = readRepo(GATE_D_RESULT_EXECUTED);
  assert.match(resultExecuted, /verdict:\s+PASS/i);
  assert.match(resultExecuted, /36\/36 PASS/i);
  assert.doesNotMatch(resultExecuted, /Phase 3B:\s*\*\*PASS\*\*/i);
  const resultTemplate = readRepo(GATE_D_RESULT);
  assert.match(resultTemplate, /Template only/i);
  assert.match(resultTemplate, /Gate D remains PENDING/i);
});

test("15 gate D prompt — exact command matches canonical one-liner", () => {
  const prompt = readRepo(GATE_D_PROMPT);
  const commands = prompt.match(GATE_D_COMMAND_RE) ?? [];
  assert.ok(commands.length > 0, "prompt: canonical Gate D command missing");
  for (const cmd of commands) {
    assert.equal(cmd, CANONICAL_GATE_D_COMMAND, "prompt: command drift");
  }
});

test("16 evidence index references gate D prod browser smoke result guard", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /test:gate-d-prod-browser-smoke-result/);
  assert.match(index, /gate-d-prod-browser-smoke-result-2026-06-28/);
  assert.match(index, /Gate D.*YES/i);
  assert.match(index, /Gate E.*PENDING/i);
  assert.match(index, /NO-GO/i);
  assert.match(index, /P0.*OPEN/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
});

test("17 gate E founder decision package — PENDING, Gate D PASS prerequisite, no overclaims", () => {
  const gateEPackage = readRepo(GATE_E_PACKAGE);
  assert.match(gateEPackage, /Gate E.*PENDING/i);
  assert.match(gateEPackage, /Gate D.*PASS|36\/36 PASS/i);
  assert.match(gateEPackage, /Phase 3B.*(NOT RUN|HARD BLOCKED)/i);
  assert.match(gateEPackage, /NO-GO/i);
  assert.match(gateEPackage, /P0.*OPEN/i);
  assert.doesNotMatch(gateEPackage, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(gateEPackage, /Phase 3B:\s*\*\*PASS\*\*/i);
});

test("18 gate E result template — template only, no execution recorded", () => {
  const template = readRepo(GATE_E_RESULT_TEMPLATE);
  assert.match(template, /Template only/i);
  assert.match(template, /no Gate E execution recorded/i);
  assert.match(template, /Gate E remains PENDING/i);
  assert.match(template, /P0.*OPEN/i);
  assert.match(template, /NO-GO/i);
});
