/**
 * Founder smoke env preflight tests — SET/UNSET only, never secret values.
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  checkFounderSmokeEnv,
  formatFounderSmokeEnvReport,
  FOUNDER_SMOKE_ENV_VARS,
} from "./founder-smoke-env-preflight";

test("1 reports all required env vars", () => {
  assert.deepEqual([...FOUNDER_SMOKE_ENV_VARS], [
    "DEMO_USER_PASSWORD",
    "RECRUITER_TOKEN",
    "TWIN_RECRUITER_TOKEN",
  ]);
});

test("2 UNSET when no env or files", () => {
  const checks = checkFounderSmokeEnv({}, { rootEnvLocal: "/nonexistent", frontendEnvLocal: "/nonexistent" });
  assert.ok(checks.every((c) => c.status === "UNSET"));
  const report = formatFounderSmokeEnvReport(checks);
  assert.match(report, /DEMO_USER_PASSWORD: UNSET/);
  assert.match(report, /Wave B candidate smoke: BLOCKED/);
  assert.match(report, /no fake PASS/i);
});

test("3 SET from process env without exposing value", () => {
  const checks = checkFounderSmokeEnv(
    { DEMO_USER_PASSWORD: "secret-not-logged" },
    { rootEnvLocal: "/nonexistent", frontendEnvLocal: "/nonexistent" },
  );
  const demo = checks.find((c) => c.name === "DEMO_USER_PASSWORD");
  assert.equal(demo?.status, "SET");
  assert.equal(demo?.source, "process");
  const report = formatFounderSmokeEnvReport(checks);
  assert.doesNotMatch(report, /secret-not-logged/);
  assert.match(report, /Wave B candidate smoke: CREDENTIALS_PRESENT/);
});

test("4 SET from frontend .env.local key presence only", () => {
  const dir = mkdtempSync(join(tmpdir(), "twin-env-preflight-"));
  const frontendEnv = join(dir, "frontend.env.local");
  writeFileSync(frontendEnv, "RECRUITER_TOKEN=from-file\n");
  try {
    const checks = checkFounderSmokeEnv({}, { rootEnvLocal: join(dir, "missing"), frontendEnvLocal: frontendEnv });
    const token = checks.find((c) => c.name === "RECRUITER_TOKEN");
    assert.equal(token?.status, "SET");
    assert.equal(token?.source, "frontend-env-local");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("5 recruiter token from either RECRUITER_TOKEN or TWIN_RECRUITER_TOKEN", () => {
  const checks = checkFounderSmokeEnv(
    { TWIN_RECRUITER_TOKEN: "x" },
    { rootEnvLocal: "/nonexistent", frontendEnvLocal: "/nonexistent" },
  );
  const report = formatFounderSmokeEnvReport(checks);
  assert.match(report, /Wave C recruiter smoke: CREDENTIALS_PRESENT/);
});

test("6 handoff doc references env preflight script", () => {
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  const { dirname, join } = require("node:path") as typeof import("node:path");
  const { fileURLToPath } = require("node:url") as typeof import("node:url");
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const doc = readFileSync(join(repoRoot, "docs/FOUNDER_SMOKE_HANDOFF_PR448_449_450_2026-07-13.md"), "utf8");
  assert.match(doc, /preflight:founder-smoke-env/);
  assert.match(doc, /SET\/UNSET only/i);
});

test("7 npm script registered", () => {
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  const { dirname, join } = require("node:path") as typeof import("node:path");
  const { fileURLToPath } = require("node:url") as typeof import("node:url");
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const pkg = readFileSync(join(repoRoot, "frontend/package.json"), "utf8");
  assert.match(pkg, /test:founder-smoke-env-preflight/);
  assert.match(pkg, /preflight:founder-smoke-env/);
});
