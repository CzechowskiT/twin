/**
 * Product inclusion taxonomy guard — CORE_PILOT Hard LIVE denominator.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { HARD_LIVE_EVIDENCE_REGISTRY } from "../src/lib/hard-live-evidence-registry";
import {
  HARD_LIVE_DENOMINATOR_RULE,
  PRODUCT_INCLUSION_BY_MODULE_ID,
  isInHardLiveDenominator,
  productInclusionFor,
  type ProductInclusion,
} from "../src/lib/product-inclusion-taxonomy";

const FORMER_HELD_OPTIONAL = [
  "cand_ms_calendar",
  "company_ms_calendar_write",
  "plat_ms_calendar_write",
  "plat_identity_kyc",
  "plat_authologic_auto_kyc",
  "plat_ats_live_sync_write",
  "plat_ats_write_sync",
  "plat_slack_connector",
] as const;

test("denominator rule is CORE_PILOT_ONLY", () => {
  assert.equal(HARD_LIVE_DENOMINATOR_RULE, "CORE_PILOT_ONLY");
});

test("taxonomy covers every Hard LIVE registry module_id", () => {
  for (const row of HARD_LIVE_EVIDENCE_REGISTRY) {
    assert.ok(
      row.module_id in PRODUCT_INCLUSION_BY_MODULE_ID,
      `missing taxonomy entry for ${row.module_id}`,
    );
  }
});

test("former optional vendors leave Hard LIVE denominator", () => {
  for (const id of FORMER_HELD_OPTIONAL) {
    assert.equal(productInclusionFor(id), "OPTIONAL_INTEGRATION");
    assert.equal(isInHardLiveDenominator(id), false);
  }
  assert.equal(productInclusionFor("ai_act_certified_claim"), "LEGAL_MARKETING_CLAIM");
  assert.equal(isInHardLiveDenominator("ai_act_certified_claim"), false);
  assert.equal(productInclusionFor("ai_protected_attr_monitoring"), "POST_PILOT");
  assert.equal(isInHardLiveDenominator("ai_protected_attr_monitoring"), false);
});

test("CORE counterparts remain in denominator", () => {
  const coreKeep = [
    "candidate_identity_verification",
    "plat_ics_export",
    "plat_ics_import",
    "recruiter_calendar",
    "plat_ats_config_read",
    "cand_notifications",
    "investor_s3_required_download",
  ] as const;
  for (const id of coreKeep) {
    assert.equal(productInclusionFor(id), "CORE_PILOT");
    assert.equal(isInHardLiveDenominator(id), true);
  }
});

test("ProductInclusion union values are exhaustive in map", () => {
  const allowed = new Set<ProductInclusion>([
    "CORE_PILOT",
    "POST_PILOT",
    "OPTIONAL_INTEGRATION",
    "LEGAL_MARKETING_CLAIM",
    "INTERNAL_ONLY",
    "REMOVED_FROM_PRODUCT",
  ]);
  for (const [id, value] of Object.entries(PRODUCT_INCLUSION_BY_MODULE_ID)) {
    assert.ok(allowed.has(value), `${id} has unknown inclusion ${value}`);
  }
});
