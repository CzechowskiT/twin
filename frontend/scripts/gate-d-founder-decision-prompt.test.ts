/**
 * Slice 30 — Gate D founder decision prompt (static, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const PROMPT = "docs/GATE_D_FOUNDER_DECISION_PROMPT_2026-06-28.md";

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

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 prompt doc exists with correct title", () => {
  const prompt = readRepo(PROMPT);
  assert.match(prompt, /Gate D Founder Decision Prompt/);
});

test("2 prompt doc contains exact founder question", () => {
  const prompt = readRepo(PROMPT);
  assert.match(
    prompt,
    new RegExp(FOUNDER_QUESTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
});

test("3 prompt doc requires exact answer Gate D = YES and allows Gate D = NO / PENDING", () => {
  const prompt = readRepo(PROMPT);
  assert.match(prompt, /Gate D = YES/);
  assert.match(prompt, /Gate D = NO \/ PENDING/);
});

test("4 prompt doc contains exact Gate D command with required parts", () => {
  const prompt = readRepo(PROMPT);
  for (const part of REQUIRED_COMMAND_PARTS) {
    assert.match(prompt, new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(
    prompt,
    new RegExp(CANONICAL_GATE_D_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
});

test("5 prompt doc says command is NOT TO RUN without YES", () => {
  const prompt = readRepo(PROMPT);
  assert.match(prompt, /NOT TO RUN/i);
  assert.match(prompt, /without.*Gate D = YES|without an explicit founder answer/i);
  assert.match(prompt, /must not run/i);
});

test("6 prompt doc — Gate D PENDING, Launch NO-GO, P0 OPEN, Gate E PENDING, Phase 3B HARD BLOCKED", () => {
  const prompt = readRepo(PROMPT);
  assert.match(prompt, /Gate D.*PENDING/i);
  assert.match(prompt, /Gate E.*PENDING/i);
  assert.match(prompt, /NO-GO/i);
  assert.match(prompt, /P0.*OPEN/i);
  assert.match(prompt, /Phase 3B.*(HARD BLOCKED|NOT RUN)/i);
});

test("7 prompt doc — YES does not allow Phase 3B, P0 closure, Launch GO, Gate E auto-YES", () => {
  const prompt = readRepo(PROMPT);
  const section = prompt.split("## 5. What Gate D = YES Does Not Allow")[1] ?? "";
  assert.match(section, /Phase 3B/i);
  assert.match(section, /P0.*OPEN/i);
  assert.match(section, /NO-GO/i);
  assert.match(section, /Gate E/i);
  assert.match(section, /separate/i);
});

test("8 prompt doc — YES does not allow CI browser enablement or prod mutation", () => {
  const prompt = readRepo(PROMPT);
  const section = prompt.split("## 5. What Gate D = YES Does Not Allow")[1] ?? "";
  assert.match(section, /smoke\.yml|CI browser|Playwright-free/i);
  assert.match(section, /Read-only|mutation/i);
});

test("9 prompt doc — no execution recorded, no overclaims", () => {
  const prompt = readRepo(PROMPT);
  assert.match(prompt, /NOT EXECUTED|not executed|must not run/i);
  assert.doesNotMatch(prompt, /\| \*\*Gate D\*\* \|.*\*\*PASS\*\*/i);
  assert.doesNotMatch(prompt, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(prompt, /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/);
});

test("10 npm script test:gate-d-founder-decision-prompt registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-d-founder-decision-prompt/);
  assert.match(pkg, /gate-d-founder-decision-prompt\.test\.ts/);
});
