import assert from "node:assert/strict";
import test from "node:test";

import {
  isRecruiterInboxActionable,
  recruiterInboxDecisionBadge,
  recruiterInboxMatchesStatusFilter,
} from "../src/lib/recruiter-inbox-decision";

test("actionable statuses show accept and decline controls", () => {
  for (const status of ["applied", "pending", "APPLIED"]) {
    assert.equal(isRecruiterInboxActionable(status), true);
    assert.equal(recruiterInboxDecisionBadge(status), null);
  }
});

test("interview and rejected rows use decision badges, not action buttons", () => {
  assert.equal(recruiterInboxDecisionBadge("interview"), "accepted");
  assert.equal(recruiterInboxDecisionBadge("rejected"), "declined");
  assert.equal(isRecruiterInboxActionable("interview"), false);
  assert.equal(isRecruiterInboxActionable("rejected"), false);
});

test("applied filter hides decided rows; all filter keeps badges visible", () => {
  assert.equal(recruiterInboxMatchesStatusFilter("applied", "applied"), true);
  assert.equal(recruiterInboxMatchesStatusFilter("pending", "applied"), true);
  assert.equal(recruiterInboxMatchesStatusFilter("interview", "applied"), false);
  assert.equal(recruiterInboxMatchesStatusFilter("rejected", "applied"), false);
  assert.equal(recruiterInboxMatchesStatusFilter("interview", "all"), true);
  assert.equal(recruiterInboxMatchesStatusFilter("rejected", "all"), true);
  assert.equal(recruiterInboxMatchesStatusFilter("interview", "interview"), true);
});
