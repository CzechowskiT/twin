import assert from "node:assert/strict";
import test from "node:test";

import {
  REVIEW_CARD_SECTIONS,
  reviewCardDataConfidenceKey,
  reviewCardSectionItems,
  type RecruiterReviewCard,
} from "../src/lib/recruiter-review-card";

const sampleCard: RecruiterReviewCard = {
  why_this_candidate: "Solid overlap with posting.",
  requirements_matched: ["Python in posting"],
  uncertain_or_missing: ["No CV text"],
  what_to_verify: ["Confirm salary"],
  data_confidence: "medium",
  red_flags: [],
  human_decision_required: true,
  disclaimer: "Rule-based guidance only.",
};

test("review card exposes eight sections A–H", () => {
  assert.equal(REVIEW_CARD_SECTIONS.length, 8);
  assert.deepEqual(REVIEW_CARD_SECTIONS, [
    "whyThisCandidate",
    "requirementsMatched",
    "uncertainOrMissing",
    "whatToVerify",
    "dataConfidence",
    "redFlags",
    "humanDecision",
    "disclaimer",
  ]);
});

test("data confidence maps to i18n keys", () => {
  assert.equal(reviewCardDataConfidenceKey("high"), "reviewDataConfidenceHigh");
  assert.equal(reviewCardDataConfidenceKey("medium"), "reviewDataConfidenceMedium");
  assert.equal(reviewCardDataConfidenceKey("low"), "reviewDataConfidenceLow");
  assert.equal(reviewCardDataConfidenceKey("unknown"), "reviewDataConfidenceUnknown");
  assert.equal(reviewCardDataConfidenceKey(null), "reviewDataConfidenceUnknown");
});

test("section items return backend-shaped strings", () => {
  assert.equal(reviewCardSectionItems(sampleCard, "whyThisCandidate")[0], sampleCard.why_this_candidate);
  assert.equal(reviewCardSectionItems(sampleCard, "requirementsMatched").length, 1);
  assert.equal(reviewCardSectionItems(sampleCard, "redFlags").length, 0);
  assert.equal(reviewCardSectionItems(sampleCard, "humanDecision")[0], "true");
});
