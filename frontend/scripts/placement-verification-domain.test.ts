/**
 * Placement verification domain — allowlists, demo record, source badge.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getPlacementVerificationDemo,
  isAllowedPlacementStatus,
  isAllowedVerificationStage,
  PLACEMENT_STATUS_ALLOWLIST,
  PLACEMENT_VERIFICATION_DEMO_ID,
  VERIFICATION_STAGE_ALLOWLIST,
} from "../src/lib/placement-verification-demo-data";
import {
  hasHumanReviewRisk,
  missingExternalConfirmation,
  placementVerificationSourceKey,
  resolvePlacementVerification,
} from "../src/lib/placement-verification";
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

test("1 placement status allowlist has six states", () => {
  assert.equal(PLACEMENT_STATUS_ALLOWLIST.length, 6);
  assert.ok(isAllowedPlacementStatus("verification_pending"));
  assert.equal(isAllowedPlacementStatus("bogus"), false);
});

test("2 verification stage allowlist has seven stages", () => {
  assert.equal(VERIFICATION_STAGE_ALLOWLIST.length, 7);
  assert.ok(isAllowedVerificationStage("external_confirmation_pending"));
  assert.equal(isAllowedVerificationStage("bogus"), false);
});

test("3 demo record has required domain fields", () => {
  const record = getPlacementVerificationDemo();
  assert.equal(record.placement_id, PLACEMENT_VERIFICATION_DEMO_ID);
  assert.ok(record.candidate_id);
  assert.ok(record.role_context_id);
  assert.ok(record.company_slug);
  assert.ok(record.application_id);
  assert.ok(record.match_id);
  assert.ok(record.evidence_items.length >= 3);
  assert.ok(record.risk_flags.length >= 1);
  assert.equal(record.economics_preview.payment_initiated, false);
  assert.equal(record.economics_preview.invoice_status, "none");
  assert.ok(record.audit_references.length >= 1);
  assert.equal(record.source, "demo");
});

test("4 resolve returns demo for demo id and null for unknown", () => {
  assert.ok(resolvePlacementVerification(PLACEMENT_VERIFICATION_DEMO_ID));
  assert.equal(resolvePlacementVerification("not-real"), null);
});

test("5 missing external confirmation helper", () => {
  const record = getPlacementVerificationDemo();
  assert.equal(missingExternalConfirmation(record), true);
});

test("6 source badge maps to safe persistence i18n keys", () => {
  assert.equal(placementVerificationSourceKey("demo"), "safePersistence.demoFallback");
  assert.equal(placementVerificationSourceKey("live"), "safePersistence.liveApi");
  assert.equal(placementVerificationSourceKey("partial"), "liveOperatingState.partialFallback");
});

test("7 demo data contains no forbidden commercial or legal claims", () => {
  const blob = read("src/lib/placement-verification-demo-data.ts");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in demo data`);
  }
});

test("8 economics preview is no-op only", () => {
  const record = getPlacementVerificationDemo();
  assert.equal(record.economics_preview.fee_eligibility, "not_evaluated");
  assert.equal(record.economics_preview.payment_initiated, false);
  assert.match(record.economics_preview.note, /no payment/i);
});

test("9 human review risk helper respects stage and flags", () => {
  const record = getPlacementVerificationDemo();
  assert.equal(hasHumanReviewRisk(record), false);
  const staged = { ...record, verification_stage: "human_review" as const };
  assert.equal(hasHumanReviewRisk(staged), true);
});

test("10 i18n safePersistence keys exist for source badge", () => {
  for (const key of ["demoFallback", "liveApi"] as const) {
    assert.ok(en.safePersistence[key]);
    assert.ok(dictionaries.pl.safePersistence[key]);
  }
});
