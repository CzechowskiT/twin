import assert from "node:assert/strict";
import {
  groupMatchesByConfidence,
  matchConfidenceGroupId,
} from "../src/lib/match-quality-groups";

assert.equal(matchConfidenceGroupId(85), "strong_fit");
assert.equal(matchConfidenceGroupId(65), "strong_fit");
assert.equal(matchConfidenceGroupId(45), "worth_reviewing");
assert.equal(matchConfidenceGroupId(30), "low_confidence");

const grouped = groupMatchesByConfidence([
  { score: 80, job_id: 1 },
  { score: 42, job_id: 2 },
  { score: 35, job_id: 3 },
  { score: 70, job_id: 4 },
]);

assert.equal(grouped.length, 3);
assert.equal(grouped[0].id, "strong_fit");
assert.equal(grouped[0].items.length, 2);
assert.equal(grouped[1].id, "worth_reviewing");
assert.equal(grouped[2].id, "low_confidence");

console.log("match-quality-groups.test.ts: ok");
