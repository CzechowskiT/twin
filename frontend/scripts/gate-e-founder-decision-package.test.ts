/**
 * Slice 33 — Gate E founder decision package (static, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const GATE_E_PACKAGE = "docs/GATE_E_FOUNDER_DECISION_PACKAGE_2026-06-28.md";
const GATE_E_TEMPLATE = "docs/gate-e-phase3b-result-template-2026-06-28.md";
const GATE_D_RESULT = "docs/gate-d-prod-browser-smoke-result-2026-06-28.md";

const FOUNDER_QUESTION =
  "Do you approve Gate E = YES to run controlled Phase 3B validation?";

const CANONICAL_GATE_E_PROD_COMMAND =
  "cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:phase3b-controlled-multitab-prod";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 gate E founder decision package exists with correct title", () => {
  const pkg = readRepo(GATE_E_PACKAGE);
  assert.match(pkg, /Gate E Founder Decision Package/);
});

test("2 gate E result template exists", () => {
  const template = readRepo(GATE_E_TEMPLATE);
  assert.match(template, /Gate E Phase 3B Controlled Multitab — Result Template/);
});

test("3 gate E package references Gate D result doc and 36/36 PASS", () => {
  const pkg = readRepo(GATE_E_PACKAGE);
  assert.match(pkg, /gate-d-prod-browser-smoke-result-2026-06-28\.md/);
  assert.match(pkg, /36\/36 PASS/i);
  assert.match(pkg, /Gate D.*YES.*PASS|YES \/ PASS/i);
});

test("4 gate E package — Gate E PENDING, Phase 3B NOT RUN / HARD BLOCKED", () => {
  const pkg = readRepo(GATE_E_PACKAGE);
  assert.match(pkg, /Gate E.*PENDING/i);
  assert.match(pkg, /Phase 3B.*(NOT RUN|HARD BLOCKED)/i);
  assert.match(pkg, /does NOT execute Phase 3B|NOT EXECUTED/i);
});

test("5 gate E package — Launch NO-GO, P0 OPEN", () => {
  const pkg = readRepo(GATE_E_PACKAGE);
  assert.match(pkg, /NO-GO/i);
  assert.match(pkg, /P0.*OPEN/i);
  assert.doesNotMatch(pkg, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(pkg, /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/);
});

test("6 gate E package — exact founder question and YES / NO / PENDING answers", () => {
  const pkg = readRepo(GATE_E_PACKAGE);
  assert.match(
    pkg,
    new RegExp(FOUNDER_QUESTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(pkg, /Gate E = YES/);
  assert.match(pkg, /Gate E = NO \/ PENDING/);
});

test("7 gate E package — does not execute Phase 3B, approve launch, or close P0", () => {
  const pkg = readRepo(GATE_E_PACKAGE);
  const purpose = pkg.split("## 1. Purpose")[1]?.split("## 2.")[0] ?? "";
  assert.match(purpose, /does NOT/i);
  assert.match(purpose, /Execute Phase 3B/i);
  assert.match(purpose, /Approve public launch/i);
  assert.match(purpose, /Close P0/i);
  assert.match(pkg, /This package does not set Gate E = YES/i);
});

test("8 gate E package — forbids stress, CPU storm, default CI browser, prod mutation", () => {
  const section = pkgSection(readRepo(GATE_E_PACKAGE), "8. What Gate E Will Not Do");
  assert.match(section, /stress|CPU-storm/i);
  assert.match(section, /default CI browser/i);
  assert.match(section, /Mutate production|Read-only/i);
  assert.match(section, /NO-GO/i);
  assert.match(section, /P0.*OPEN/i);
  assert.match(section, /Gate F/i);
});

test("9 gate E package — verified prod Phase 3B command with env flags", () => {
  const pkg = readRepo(GATE_E_PACKAGE);
  assert.match(
    pkg,
    new RegExp(CANONICAL_GATE_E_PROD_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(pkg, /PLAYWRIGHT_ALLOW_PROD_SMOKE=1/);
  assert.match(pkg, /PLAYWRIGHT_SKIP_WEBSERVER=1/);
  assert.match(pkg, /test:phase3b-controlled-multitab-prod/);
  assert.match(pkg, /20/);
  assert.match(pkg, /7 \+ 7 \+ 6/);
});

test("10 gate E result template — template only, no execution, no PASS claim", () => {
  const template = readRepo(GATE_E_TEMPLATE);
  assert.match(template, /Template only/i);
  assert.match(template, /no Gate E execution recorded/i);
  assert.match(template, /Gate E remains PENDING/i);
  assert.match(template, /Do not treat this.*Gate E PASS/i);
  assert.match(template, /Phase 3B remains NOT RUN/i);
  assert.match(template, /P0.*OPEN/i);
  assert.match(template, /NO-GO/i);
  assert.doesNotMatch(template, /pass:\s+20/i);
  assert.doesNotMatch(template, /36\/36 PASS/i);
});

test("11 gate E package — does not set Gate F; after PASS keeps launch blocked", () => {
  const pkg = readRepo(GATE_E_PACKAGE);
  const afterPass = pkgSection(pkg, "9. After Gate E PASS");
  assert.match(afterPass, /Gate F.*PENDING/i);
  assert.match(afterPass, /NO-GO/i);
  assert.match(afterPass, /P0.*OPEN/i);
  assert.match(afterPass, /gate-e-phase3b-result-template-2026-06-28\.md/);
});

test("12 npm script test:gate-e-founder-decision-package registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /test:gate-e-founder-decision-package/);
  assert.match(pkgJson, /gate-e-founder-decision-package\.test\.ts/);
});

test("13 gate D result doc confirms PASS prerequisite for Gate E consideration", () => {
  const gateD = readRepo(GATE_D_RESULT);
  assert.match(gateD, /36\/36 PASS/i);
  assert.match(gateD, /Gate E.*PENDING/i);
  assert.match(gateD, /Phase 3B.*HARD BLOCKED/i);
});

function pkgSection(doc: string, heading: string): string {
  return doc.split(`## ${heading}`)[1]?.split("## ")[0] ?? "";
}
