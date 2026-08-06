/** Epic 2.11 — IA / empty / tour / preview guards. */
import assert from "node:assert/strict";
import { ACTIONABLE_EMPTY_STATES, EMPTY_STATE_CONTRACT } from "../src/lib/actionable-empty-states.ts";
import {
  CANDIDATE_PRIMARY_IA,
  FIRST_VALUE_CONTRACT,
  MEASUREMENT_CONTRACTS_211,
  PUBLIC_PREVIEW_ENABLED_IN_PRODUCTION,
  PUBLIC_PREVIEW_STATUS,
} from "../src/lib/candidate-ia.ts";
import { PRODUCT_FUNNEL_EVENTS } from "../src/lib/product-funnel-events.ts";

assert.equal(CANDIDATE_PRIMARY_IA.length, 7);
assert.equal(FIRST_VALUE_CONTRACT.id, "pilot_first_value_v1");
assert.equal(PUBLIC_PREVIEW_STATUS, "READY_INACTIVE");
assert.equal(PUBLIC_PREVIEW_ENABLED_IN_PRODUCTION, false);
assert.equal(EMPTY_STATE_CONTRACT.complete, 7);
assert.equal(EMPTY_STATE_CONTRACT.loadingEqualsEmpty, false);
assert.equal(EMPTY_STATE_CONTRACT.errorEqualsEmpty, false);
for (const area of CANDIDATE_PRIMARY_IA) {
  assert.ok(ACTIONABLE_EMPTY_STATES[area.emptyStateKey], `missing empty for ${area.id}`);
}
assert.ok(MEASUREMENT_CONTRACTS_211.includes("isolated_demo_v1"));
assert.ok(PRODUCT_FUNNEL_EVENTS.includes("isolated_demo_started"));
assert.ok(PRODUCT_FUNNEL_EVENTS.includes("product_tour_completed"));
console.log("epic-211-guided-fv-guard: ok");
