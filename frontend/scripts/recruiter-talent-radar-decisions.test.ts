import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  effectiveDecisionState,
  matchesDecisionFilter,
  TALENT_RADAR_DECISION_ACTIONS,
  TALENT_RADAR_DECISION_FILTERS,
  TALENT_RADAR_DECISION_MARKERS,
  TALENT_RADAR_DISMISS_REASON_CODES,
  TALENT_RADAR_SNOOZE_DAYS,
  talentRadarDecisionsQuery,
} from "../src/lib/recruiter-talent-radar-decisions";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";
import { RECRUITER_AUDIT_ACTION_TYPES } from "../src/lib/recruiter-audit-trail";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 decisions BFF route exists", () => {
  assert.match(readSrc("src/app/api/recruiter/talent-radar/decisions/route.ts"), /talent-radar\/decisions/);
});

test("2 decision action types frozen", () => {
  assert.deepEqual([...TALENT_RADAR_DECISION_ACTIONS], [
    "shortlisted",
    "snoozed",
    "dismissed",
    "draft_prepared",
    "review_card_opened",
  ]);
});

test("3 snooze days are 7/30/90 only", () => {
  assert.deepEqual([...TALENT_RADAR_SNOOZE_DAYS], [7, 30, 90]);
});

test("4 dismiss reason codes are category-only", () => {
  assert.ok(TALENT_RADAR_DISMISS_REASON_CODES.includes("low_fit"));
  assert.ok(TALENT_RADAR_DISMISS_REASON_CODES.includes("other"));
});

test("5 decision filter values", () => {
  assert.deepEqual([...TALENT_RADAR_DECISION_FILTERS], [
    "active",
    "shortlisted",
    "snoozed",
    "dismissed",
  ]);
});

test("6 client wires decision filter bar", () => {
  const client = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  const filterBar = readSrc("src/components/recruiter/talent-radar/talent-radar-decision-filter-bar.tsx");
  assert.match(client, /TalentRadarDecisionFilterBar/);
  assert.match(filterBar, /TALENT_RADAR_DECISION_MARKERS\.decisionFilter/);
});

test("7 snooze and dismiss modals present", () => {
  const client = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  assert.match(client, /TalentRadarSnoozeModal/);
  assert.match(client, /TalentRadarDismissModal/);
  assert.match(readSrc("src/components/recruiter/talent-radar/talent-radar-decision-modals.tsx"), /snoozeModal/);
});

test("8 candidate card shows decision badge", () => {
  assert.match(
    readSrc("src/components/recruiter/talent-radar/talent-radar-candidate-card.tsx"),
    /TALENT_RADAR_DECISION_MARKERS\.decisionBadge/,
  );
});

test("9 no email send or auto outreach in client", () => {
  const client = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  assert.doesNotMatch(client, /send.*email|auto.*send|wyslij.*wiadom/i);
  assert.match(client, /draft_prepared/);
});

test("10 optimistic decision POST to BFF", () => {
  const client = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  assert.match(client, /\/api\/recruiter\/talent-radar\/decisions/);
  assert.match(client, /applyOptimisticDecision/);
});

test("11 decision filter helper matches states", () => {
  assert.equal(matchesDecisionFilter(null, "active"), true);
  assert.equal(
    matchesDecisionFilter({ decision_state: "shortlisted" } as never, "shortlisted"),
    true,
  );
  assert.equal(
    matchesDecisionFilter({ decision_state: "shortlisted" } as never, "active"),
    false,
  );
  assert.equal(effectiveDecisionState(null), "active");
});

test("12 audit trail includes radar action types", () => {
  for (const act of [
    "radar_shortlisted",
    "radar_snoozed",
    "radar_dismissed",
    "radar_draft_prepared",
    "radar_review_card_opened",
  ]) {
    assert.ok((RECRUITER_AUDIT_ACTION_TYPES as readonly string[]).includes(act));
  }
});

test("13 i18n decision keys for all locales", () => {
  for (const locale of LOCALES) {
    const copy = dictionaries[locale].recruiterTalentRadar;
    assert.ok(copy.decisionFilterTitle.length > 0, locale);
    assert.ok(copy.decisionShortlisted.length > 0, locale);
    assert.ok(copy.dismissReason_low_fit.length > 0, locale);
  }
});

test("14 EN copy states no automatic outreach on snooze modal", () => {
  assert.match(en.recruiterTalentRadar.snoozeModalBody.toLowerCase(), /no automatic outreach/);
});

test("15 decisions query builder", () => {
  const q = talentRadarDecisionsQuery("tok", "acme", { decisionFilter: "shortlisted", applicationId: 9 });
  assert.equal(q.get("token"), "tok");
  assert.equal(q.get("company_slug"), "acme");
  assert.equal(q.get("decision_filter"), "shortlisted");
  assert.equal(q.get("application_id"), "9");
});
