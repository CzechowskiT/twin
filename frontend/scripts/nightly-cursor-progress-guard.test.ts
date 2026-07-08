/**
 * Nightly Cursor progress — static guard (2026-07-09 session summary).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CANONICAL_STANCE } from "../src/lib/seven-day-d7-final-qa";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const NIGHTLY_DOC = "docs/NIGHTLY_CURSOR_PROGRESS_2026-07-09.md";
const GATE_F_PACKAGE = "docs/GATE_F_FOUNDER_REVIEW_PACKAGE_2026-07-09.md";
const CANDIDATE_FLOW = "docs/CANDIDATE_READINESS_WORKING_FLOW_2026-07-09.md";
const D7_DOC = "docs/SEVEN_DAY_D7_FINAL_QA_2026-07-08.md";

const MERGED_PRS = [
  { num: 427, sha: "fff90a46" },
  { num: 428, sha: "a2f4f5f7" },
  { num: 429, sha: "51a4961f" },
  { num: 430, sha: "09b4a9a3" },
] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 nightly progress doc exists with session date", () => {
  const doc = readRepo(NIGHTLY_DOC);
  assert.match(doc, /Nightly Cursor progress.*2026-07-09/);
});

test("2 nightly doc — merged PRs 427–430 with SHAs", () => {
  const doc = readRepo(NIGHTLY_DOC);
  for (const pr of MERGED_PRS) {
    assert.match(doc, new RegExp(`#${pr.num}|pull/${pr.num}`));
    assert.match(doc, new RegExp(pr.sha.slice(0, 7)));
  }
});

test("3 nightly doc — stance and hard bans unchanged", () => {
  const doc = readRepo(NIGHTLY_DOC);
  assert.match(doc, /P0 CLOSED/);
  assert.match(doc, /Gate E PASS/);
  assert.match(doc, /Gate F PENDING/);
  assert.match(doc, /Launch NO-GO/);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
});

test("4 nightly doc — D7, candidate flow, Gate F package, NVIDIA status", () => {
  const doc = readRepo(NIGHTLY_DOC);
  assert.match(doc, /D7/);
  assert.match(doc, /Ready for Gate F review/i);
  assert.match(doc, /CANDIDATE_READINESS_WORKING_FLOW_2026-07-09\.md/);
  assert.match(doc, /GATE_F_FOUNDER_REVIEW_PACKAGE_2026-07-09\.md/);
  assert.match(doc, /12\/12 PASS|12\/12/);
  readRepo(GATE_F_PACKAGE);
  readRepo(CANDIDATE_FLOW);
  readRepo(D7_DOC);
});

test("5 nightly doc — test results table and founder decisions", () => {
  const doc = readRepo(NIGHTLY_DOC);
  assert.match(doc, /Test results/i);
  assert.match(doc, /Founder decisions/i);
  assert.match(doc, /Gate F = YES/);
});

test("6 npm script test:nightly-cursor-progress-guard registered", () => {
  const pkgJson = read("package.json");
  assert.match(pkgJson, /"test:nightly-cursor-progress-guard":/);
  assert.match(pkgJson, /nightly-cursor-progress-guard\.test\.ts/);
});
