/**
 * Candidate referrals dashboard — Wave B slice 3 persistence wiring.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildReferralShareUrl,
  CANDIDATE_REFERRALS_API_PATH,
  referralStatusLabelKey,
} from "../src/lib/candidate-referrals-api";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("referrals API paths are under candidates namespace", () => {
  assert.match(CANDIDATE_REFERRALS_API_PATH, /^\/api\/v1\/candidates\/me\/referrals/);
});

test("buildReferralShareUrl joins origin and path", () => {
  const url = buildReferralShareUrl("https://twin.example.com", "/register?ref=abc");
  assert.equal(url, "https://twin.example.com/register?ref=abc");
});

test("referral status label keys map to i18n", () => {
  assert.equal(referralStatusLabelKey("pending"), "referrals.statusPending");
  assert.equal(referralStatusLabelKey("signed_up"), "referrals.statusSignedUp");
  assert.equal(referralStatusLabelKey("qualified"), "referrals.statusQualified");
});

test("dashboard uses persistence API and honest pilot UI", () => {
  const dashboard = read("src/components/referrals/referrals-dashboard.tsx");
  assert.match(dashboard, /data-candidate-referrals-loading/);
  assert.match(dashboard, /data-candidate-referrals-error/);
  assert.match(dashboard, /manual_processing_notice/);
  assert.match(dashboard, /howItWorksTitle/);
});
