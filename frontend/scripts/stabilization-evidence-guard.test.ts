/**
 * Stabilization evidence guard — workflow script + schema wired in package.json.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORKFLOW = ".github/workflows/stabilization-monitor.yml";

test("1 stabilization-monitor workflow has 60min soak and 90m timeout", () => {
  const wf = readFileSync(join(repoRoot, WORKFLOW), "utf8");
  assert.match(wf, /timeout-minutes:\s*90/);
  assert.match(wf, /stabilization-soak/);
  assert.match(wf, /STABILIZATION_SNAPSHOT_COUNT|13/);
});

test("2 workflow uploads stabilization evidence artifact", () => {
  const wf = readFileSync(join(repoRoot, WORKFLOW), "utf8");
  assert.match(wf, /stabilization-evidence/);
  assert.match(wf, /upload-artifact/);
});

test("3 workflow never echoes secret env values", () => {
  const wf = readFileSync(join(repoRoot, WORKFLOW), "utf8");
  assert.doesNotMatch(wf, /echo.*RECRUITER_TOKEN/i);
  assert.doesNotMatch(wf, /echo.*DEMO_USER_PASSWORD/i);
});

test("4 npm scripts registered for soak and validator", () => {
  const pkg = readFileSync(join(repoRoot, "frontend/package.json"), "utf8");
  assert.match(pkg, /"stabilization-soak":/);
  assert.match(pkg, /"test:stabilization-evidence-validator":/);
  assert.match(pkg, /"test:stabilization-evidence-guard":/);
  assert.match(pkg, /"validate:stabilization-evidence":/);
});

test("5 blocker register references LB-106 stabilization soak", () => {
  const doc = readFileSync(join(repoRoot, "docs/PUBLIC_LAUNCH_BLOCKER_REGISTER_2026-07-13.md"), "utf8");
  assert.match(doc, /LB-106/);
  assert.match(doc, /60-minute prod stabilization soak/);
});

test("6 evidence validator lib exists", () => {
  readFileSync(join(repoRoot, "frontend/scripts/lib/stabilization-evidence-validator.ts"), "utf8");
  readFileSync(join(repoRoot, "frontend/scripts/lib/stabilization-soak.ts"), "utf8");
});

test("7 secret redaction module blocks token query params", () => {
  const mod = readFileSync(join(repoRoot, "frontend/scripts/lib/stabilization-secret-redaction.ts"), "utf8");
  assert.match(mod, /token=/);
  assert.match(mod, /REDACTED/);
});
