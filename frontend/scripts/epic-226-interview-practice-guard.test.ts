/**
 * Epic 2.26 — FE guard: adaptive practice secondary, no SynthCo auto-write,
 * no invented score/100 UI, PRIMARY_IA stays 7.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const ia = read("src/lib/candidate-ia.ts");
const primary = ia.split("CANDIDATE_SECONDARY_IA")[0];
assert.equal((primary.match(/href:/g) || []).length, 7, "primary IA must stay 7");
assert.match(ia, /\/dashboard\/interview-practice/);
assert.match(ia, /disposition: "keep_secondary"/);

const decision = read("src/app/dashboard/interview-decision/page.tsx");
assert.doesNotMatch(decision, /runChain\s*\(/);
assert.doesNotMatch(decision, /company:\s*["']SynthCo["']/);
assert.match(decision, /interview-practice/);
assert.match(decision, /createProcess|processCreated/);

const practice = read("src/app/dashboard/interview-practice/page.tsx");
assert.match(practice, /promote-to-evidence/);
assert.match(practice, /PRACTICE_WORK_SAMPLE|promoteEvidence/);
assert.match(practice, /noScoreClaim|criterion/);
assert.doesNotMatch(practice, /\$\{.*score.*\}\s*\/\s*100/);
assert.doesNotMatch(practice, /score\s*\/\s*100\s*points/i);

const coach = read("src/components/career/InterviewCoachPanel.tsx");
assert.doesNotMatch(coach, /min\(85/);
assert.match(coach, /score_available|EVALUATION_UNAVAILABLE|unavailable/i);

const i18n = read("src/lib/i18n.ts");
assert.match(i18n, /interviewPractice:\s*\{/);
assert.match(i18n, /promoteEvidence/);

console.log("epic-226-interview-practice-guard: ok");
