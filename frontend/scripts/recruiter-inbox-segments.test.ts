import assert from "node:assert/strict";
import test from "node:test";

import {
  RECRUITER_INBOX_SEGMENTS,
  recruiterInboxAwaitingDecisionCount,
  recruiterInboxMatchesSegmentFilter,
  recruiterInboxSegment,
  recruiterInboxSegmentCounts,
  recruiterInboxStatusLabelKey,
} from "../src/lib/recruiter-inbox-segments";

test("segments map match labels and scores for actionable rows", () => {
  assert.equal(recruiterInboxSegment({ status: "applied", match_score_label: "excellent" }), "strong_fit");
  assert.equal(recruiterInboxSegment({ status: "pending", match_score: 82 }), "strong_fit");
  assert.equal(recruiterInboxSegment({ status: "applied", match_score_label: "good" }), "good_fit");
  assert.equal(recruiterInboxSegment({ status: "applied", match_score: 65 }), "good_fit");
  assert.equal(recruiterInboxSegment({ status: "applied", match_score_label: "possible" }), "needs_verification");
  assert.equal(recruiterInboxSegment({ status: "applied", match_score: 30 }), "needs_verification");
});

test("decided statuses map to decided segment regardless of score", () => {
  assert.equal(recruiterInboxSegment({ status: "interview", match_score: 95 }), "decided");
  assert.equal(recruiterInboxSegment({ status: "rejected", match_score_label: "excellent" }), "decided");
});

test("segment filter and counts derive from rows", () => {
  const rows = [
    { status: "applied", match_score_label: "excellent" },
    { status: "applied", match_score_label: "good" },
    { status: "pending", match_score: 45 },
    { status: "interview", match_score: 90 },
  ];
  assert.equal(recruiterInboxAwaitingDecisionCount(rows), 3);
  assert.deepEqual(recruiterInboxSegmentCounts(rows), {
    strong_fit: 1,
    good_fit: 1,
    needs_verification: 1,
    decided: 1,
  });
  assert.equal(recruiterInboxMatchesSegmentFilter(rows[0], "strong_fit"), true);
  assert.equal(recruiterInboxMatchesSegmentFilter(rows[3], "strong_fit"), false);
  assert.equal(RECRUITER_INBOX_SEGMENTS.length, 4);
});

test("status label keys cover actionable and decided rows", () => {
  assert.equal(recruiterInboxStatusLabelKey("applied"), "statusAwaitingDecision");
  assert.equal(recruiterInboxStatusLabelKey("interview"), "statusAcceptedInterview");
  assert.equal(recruiterInboxStatusLabelKey("rejected"), "statusDeclined");
});
