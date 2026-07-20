/**
 * Activation matching status UX + feature flags (Activation TTV Proof).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ACTIVATION_MATCHING_STATUS_ENABLED,
  TTV_MATCHES_REDIRECT_ENABLED,
} from "../src/lib/features.ts";
import { PRODUCT_FUNNEL_EVENTS } from "../src/lib/product-funnel-events.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("activation status flag defaults on", () => {
  assert.equal(ACTIVATION_MATCHING_STATUS_ENABLED, true);
  assert.equal(TTV_MATCHES_REDIRECT_ENABLED, true);
});

test("activation funnel events listed", () => {
  for (const name of [
    "activation_matching_eligible",
    "activation_matching_dispatched",
    "activation_first_match_created",
    "activation_ttv_matches_view",
  ]) {
    assert.ok(PRODUCT_FUNNEL_EVENTS.includes(name as (typeof PRODUCT_FUNNEL_EVENTS)[number]));
  }
});

test("matches workspace wires activation status + activated query", () => {
  const ws = read("src/components/candidate/candidate-matches-workspace.tsx");
  assert.match(ws, /ActivationMatchingStatus/);
  assert.match(ws, /activated/);
  const banner = read("src/components/candidate/activation-matching-status.tsx");
  assert.match(banner, /matching_in_progress/);
  assert.match(banner, /matches_ready/);
  assert.match(banner, /profile_incomplete/);
  assert.match(banner, /worker_unavailable/);
  assert.match(banner, /activation-ttv-view/);
  assert.match(banner, /aria-live/);
  assert.match(banner, /role="status"/);
});

test("i18n PL/EN activationMatching keys present", () => {
  const i18n = read("src/lib/i18n.ts");
  assert.match(i18n, /activationMatching:\s*\{/);
  assert.match(i18n, /pendingTitle: "Finding your matches"/);
  assert.match(i18n, /pendingTitle: "Szukamy dopasowań"/);
  assert.match(i18n, /retryUnavailable/);
});
