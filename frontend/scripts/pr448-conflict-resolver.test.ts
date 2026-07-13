/** PR #448 conflict resolver contract tests. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  PR448_CONFLICT_FILES,
  appendMasterPlanDoc,
  mergeActivationById,
  resolvePackageJsonScripts,
  resolvePr448Conflicts,
  unionGuardTests,
} from "./lib/pr448-conflict-resolver";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTRACT = join(repoRoot, "docs/CONFLICT_RESOLUTION_CONTRACT_PR448_2026-07-13.md");

test("1 contract doc lists 4 files", () => {
  const doc = readFileSync(CONTRACT, "utf8");
  assert.match(doc, /Known conflict files \(4\)/i);
  for (const f of PR448_CONFLICT_FILES) {
    assert.match(doc, new RegExp(f.replace(/\//g, "\\/")));
  }
});

test("2 package.json union merges scripts", () => {
  const base = JSON.stringify({ scripts: { build: "next build" } });
  const ours = JSON.stringify({ scripts: { build: "next build", "test:c2": "tsx c2" } });
  const theirs = JSON.stringify({ scripts: { build: "next build", "test:b3": "tsx b3" } });
  const r = resolvePackageJsonScripts(base, ours, theirs);
  assert.equal(r.ok, true);
  const parsed = JSON.parse(r.content) as { scripts: Record<string, string> };
  assert.equal(parsed.scripts["test:c2"], "tsx c2");
  assert.equal(parsed.scripts["test:b3"], "tsx b3");
});

test("3 activation merge unions module key blocks", () => {
  const ours =
    "recruiter_talent_pool: { activationStatus: 'PILOT' },\nexport const WORKSPACE_MODULE_ACTIVATION = [];";
  const theirs =
    "candidate_referrals: {\n    activationStatus: 'PILOT',\n  },\nexport const WORKSPACE_MODULE_ACTIVATION = [];";
  const r = mergeActivationById(ours, theirs);
  assert.equal(r.ok, true);
  assert.match(r.content, /recruiter_talent_pool/);
  assert.match(r.content, /candidate_referrals/);
});

test("4 guard union keeps referral assertions", () => {
  const ours = 'test("b2", () => {});\ntest("trust", () => {});';
  const theirs = 'test("referrals", () => { assert.match("referral"); });';
  const r = unionGuardTests(ours, theirs);
  assert.equal(r.ok, true);
  assert.match(r.content, /referral/i);
});

test("5 master plan append adds B3 when missing", () => {
  const ours = "## Wave C\nSlice 2 talent pool";
  const theirs = "## Wave B slice 3\ncandidate referrals persistent";
  const r = appendMasterPlanDoc(ours, theirs);
  assert.equal(r.ok, true);
  assert.match(r.content, /referral/i);
});

test("6 full resolver rejects incomplete payload", () => {
  const r = resolvePr448Conflicts({});
  assert.equal(r.ok, false);
  assert.equal(r.resolutions.length, 4);
});

test("7 contract references NO-GO", () => {
  assert.match(readFileSync(CONTRACT, "utf8"), /NO-GO/);
});
