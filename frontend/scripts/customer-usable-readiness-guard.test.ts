/**
 * CI guard: customer-usable readiness ≠ Hard LIVE 143 PASS.
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
  customerUsableCounts,
  customerUsablePassModules,
  isModuleHiddenFromPilot,
  resolveCustomerUsableVerdict,
  resolveTruthfulPilotStance,
} from "../src/lib/customer-usable-readiness.ts";
import { LAUNCH_STANCE_CANON, PILOT_KPI_TOKEN } from "../src/lib/production-action-gates.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("customer usable pass count is explicit and small — not Hard LIVE 143", () => {
  const counts = customerUsableCounts();
  assert.ok(counts.customer_usable_pass >= 2);
  assert.ok(counts.customer_usable_pass < 20);
  assert.equal(counts.hard_live_core_pass_technical, 143);
  assert.notEqual(counts.customer_usable_pass, 143);
});

test("minimal journey is recruiter inbox accept/decline and marked usable", () => {
  assert.equal(MINIMAL_CUSTOMER_JOURNEY.id, "recruiter_inbox_accept_decline");
  assert.equal(MINIMAL_CUSTOMER_JOURNEY.customer_usable, true);
  assert.ok(MINIMAL_CUSTOMER_JOURNEY.module_ids.includes("recruiter_inbox"));
  const passIds = customerUsablePassModules().map((m) => m.module_id);
  assert.ok(passIds.includes("recruiter_inbox"));
  assert.ok(passIds.includes("rec_decisioning"));
});

test("auto_apply and company_team hidden from pilot users", () => {
  assert.ok(isModuleHiddenFromPilot("auto_apply"));
  assert.ok(isModuleHiddenFromPilot("company_team"));
});

test("verdict and pilot stance are truthful", () => {
  assert.match(resolveCustomerUsableVerdict(), /CUSTOMER-USABLE PILOT SCOPE COMPLETE/);
  assert.equal(resolveTruthfulPilotStance(), "READY_FOR_CONTROLLED_PILOT");
  assert.equal(CUSTOMER_USABLE_META.verdict, resolveCustomerUsableVerdict());
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
    counts: { customer_usable_pass: number; technical_pass_only: number };
    minimal_journey: { customer_usable: boolean; id: string; evidence_smoke: string };
    verdict: string;
  };
  assert.equal(doc.hard_live_core_pass_technical, 143);
  assert.equal(doc.minimal_journey.id, "recruiter_inbox_accept_decline");
  assert.equal(doc.minimal_journey.customer_usable, true);
  assert.match(doc.minimal_journey.evidence_smoke, /customer-usable-minimal-journey-smoke/);
  assert.match(doc.verdict, /COMPLETE/);
  assert.equal(doc.counts.customer_usable_pass, customerUsableCounts().customer_usable_pass);
  assert.ok(existsSync(join(root, "docs/CUSTOMER_USABLE_DEFINITION.md")));
  assert.ok(existsSync(join(root, "scripts/customer-usable-minimal-journey-smoke.py")));
});

test("registry has no CUSTOMER_USABLE with sample/demo note as sole evidence", () => {
  for (const m of CUSTOMER_USABLE_REGISTRY) {
    if (m.status === "CUSTOMER_USABLE_PASS") {
      assert.doesNotMatch(m.note.toLowerCase(), /\bonly demo\b/);
      assert.doesNotMatch(m.note.toLowerCase(), /disabled submit/);
    }
  }
});
