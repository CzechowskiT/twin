/**
 * CI guard: customer-usable readiness ≠ Hard LIVE 143 PASS.
 * Multi-role journey is the B2B bar; thin inbox-only is insufficient for Pilot READY.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CUSTOMER_USABLE_META,
  CUSTOMER_USABLE_REGISTRY,
  MINIMAL_CUSTOMER_JOURNEY,
  MULTI_ROLE_CUSTOMER_JOURNEY,
  MULTI_ROLE_JOURNEY_CUSTOMER_USABLE,
  customerUsableCounts,
  customerUsablePassModules,
  isModuleHiddenFromPilot,
  resolveCustomerUsableVerdict,
  resolveTruthfulPilotStance,
  weightedUsabilityScores,
} from "../src/lib/customer-usable-readiness.ts";
import {
  LAUNCH_STANCE_CANON,
  PILOT_KPI_TOKEN,
  PILOT_STANCE,
} from "../src/lib/production-action-gates.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("customer usable pass count is explicit and small — not Hard LIVE 143", () => {
  const counts = customerUsableCounts();
  assert.ok(counts.customer_usable_pass >= 2);
  assert.ok(counts.customer_usable_pass < 20);
  assert.equal(counts.hard_live_core_pass_technical, 143);
  assert.notEqual(counts.customer_usable_pass, 143);
});

test("minimal inbox journey remains revalidated usable", () => {
  assert.equal(MINIMAL_CUSTOMER_JOURNEY.id, "recruiter_inbox_accept_decline");
  assert.equal(MINIMAL_CUSTOMER_JOURNEY.customer_usable, true);
  const passIds = customerUsablePassModules().map((m) => m.module_id);
  assert.ok(passIds.includes("recruiter_inbox"));
  assert.ok(passIds.includes("rec_decisioning"));
});

test("multi-role journey is primary B2B bar", () => {
  assert.equal(MULTI_ROLE_CUSTOMER_JOURNEY.id, "company_recruiter_candidate_pipeline");
  assert.ok(MULTI_ROLE_CUSTOMER_JOURNEY.module_ids.includes("company_roles"));
  assert.ok(MULTI_ROLE_CUSTOMER_JOURNEY.module_ids.includes("recruiter_talent_pool_import"));
  assert.equal(MULTI_ROLE_CUSTOMER_JOURNEY.real_customer_validated, false);
  assert.equal(MULTI_ROLE_CUSTOMER_JOURNEY.real_pilot_data, false);
});

test("auto_apply and company_team hidden from pilot users", () => {
  assert.ok(isModuleHiddenFromPilot("auto_apply"));
  assert.ok(isModuleHiddenFromPilot("company_team"));
});

test("pilot stance requires multi-role usable — not inbox-only", () => {
  if (MULTI_ROLE_JOURNEY_CUSTOMER_USABLE) {
    assert.equal(resolveTruthfulPilotStance(), "READY_FOR_CONTROLLED_PILOT");
    assert.match(resolveCustomerUsableVerdict(), /MULTI-ROLE PILOT JOURNEY COMPLETE/);
  } else {
    assert.equal(resolveTruthfulPilotStance(), "TECHNICALLY_READY_BUT_CUSTOMER_JOURNEY_INCOMPLETE");
    assert.match(resolveCustomerUsableVerdict(), /MULTI-ROLE PILOT JOURNEY INCOMPLETE/);
    assert.equal(PILOT_STANCE, "TECHNICALLY_READY_BUT_CUSTOMER_JOURNEY_INCOMPLETE");
  }
  assert.equal(CUSTOMER_USABLE_META.verdict, resolveCustomerUsableVerdict());
});

test("weighted scores: technical may be 100; real validation 0; launch capped", () => {
  const scores = weightedUsabilityScores();
  assert.equal(scores.technical_existence_score, 100);
  assert.equal(scores.real_customer_validation_score, 0);
  assert.ok(scores.launch_go_readiness_score_cap <= 15);
});

test("launch remains NO-GO and KPI honest", () => {
  assert.equal(LAUNCH_STANCE_CANON, "NO-GO");
  assert.equal(PILOT_KPI_TOKEN, "NO_REAL_PILOT_DATA");
});

test("docs contract mirrors registry", () => {
  const path = join(root, "docs/CUSTOMER_USABLE_READINESS.json");
  assert.ok(existsSync(path));
  const doc = JSON.parse(readFileSync(path, "utf8")) as {
    hard_live_core_pass_technical: number;
    multi_role_journey: { customer_usable: boolean; id: string };
    verdict: string;
    evidence_label: string;
  };
  assert.equal(doc.hard_live_core_pass_technical, 143);
  assert.equal(doc.multi_role_journey.id, "company_recruiter_candidate_pipeline");
  assert.equal(doc.multi_role_journey.customer_usable, MULTI_ROLE_JOURNEY_CUSTOMER_USABLE);
  assert.match(doc.evidence_label, /synthetic/);
  assert.ok(existsSync(join(root, "scripts/customer-usable-multirole-journey-smoke.py")));
  assert.ok(existsSync(join(root, "docs/CUSTOMER_USABLE_DEFINITION.md")));
});

test("registry has no CUSTOMER_USABLE with sample/demo note as sole evidence", () => {
  for (const m of CUSTOMER_USABLE_REGISTRY) {
    if (m.status === "CUSTOMER_USABLE_PASS") {
      assert.doesNotMatch(m.note.toLowerCase(), /\bonly demo\b/);
      assert.doesNotMatch(m.note.toLowerCase(), /disabled submit/);
    }
  }
});
