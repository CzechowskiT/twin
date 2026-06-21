/**
 * Candidate placement verification preview — routes, markers, copy guards.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_PLACEMENT_VERIFICATION_MARKERS,
  CANDIDATE_PLACEMENT_VERIFICATION_PAGE_MARKER,
  CANDIDATE_PLACEMENT_VERIFICATION_ROUTE,
  candidatePlacementVerificationHref,
  resolveCandidatePlacementVerification,
} from "../src/lib/candidate-placement-verification-preview";
import { PLACEMENT_VERIFICATION_DEMO_ID } from "../src/lib/placement-verification";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_COPY = [
  /employer confirmed/i,
  /invoice sent/i,
  /payment captured/i,
  /revenue recognized/i,
  /legally verified/i,
  /launch ready/i,
  /email sent/i,
  /ATS synced/i,
  /contract signed/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 dashboard placement-verification route exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/placement-verification/page.tsx")));
});

test("2 profile placement-verification alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/profile/placement-verification/page.tsx")));
});

test("3 demo placement resolves preview record", () => {
  const record = resolveCandidatePlacementVerification(PLACEMENT_VERIFICATION_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.placement_status, "verification_pending");
});

test("4 workspace renders section markers", () => {
  const ws = read("src/components/candidate/candidate-placement-verification-preview-workspace.tsx");
  assert.match(ws, new RegExp(CANDIDATE_PLACEMENT_VERIFICATION_PAGE_MARKER));
  assert.match(ws, /CANDIDATE_PLACEMENT_VERIFICATION_MARKERS\.status/);
  assert.match(ws, /CANDIDATE_PLACEMENT_VERIFICATION_MARKERS\.evidence/);
  assert.match(ws, /CANDIDATE_PLACEMENT_VERIFICATION_MARKERS\.externalGap/);
  assert.match(ws, /CANDIDATE_PLACEMENT_VERIFICATION_MARKERS\.riskFlags/);
  assert.match(ws, /CANDIDATE_PLACEMENT_VERIFICATION_MARKERS\.demoActions/);
  assert.match(ws, /disabled/);
});

test("5 route constant and href helper", () => {
  assert.equal(CANDIDATE_PLACEMENT_VERIFICATION_ROUTE, "/dashboard/placement-verification");
  assert.equal(candidatePlacementVerificationHref(), "/dashboard/placement-verification");
});

test("6 i18n keys exist in en and pl", () => {
  assert.ok(en.candidatePlacementVerification.pageTitle);
  assert.ok(dictionaries.pl.candidatePlacementVerification.pageTitle);
});

test("7 workspace and i18n contain no forbidden claims", () => {
  const blob = [
    read("src/components/candidate/candidate-placement-verification-preview-workspace.tsx"),
    JSON.stringify(en.candidatePlacementVerification),
    JSON.stringify(dictionaries.pl.candidatePlacementVerification),
  ].join("\n");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});
