import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  shortRecruiterInboxChipText,
  localizeRecruiterInboxChipText,
} from "../src/lib/recruiter-inbox-chip-copy";
import { RECRUITER_INBOX_VISUAL_MARKERS } from "../src/lib/recruiter-inbox-visual";
import { dictionaries } from "../src/lib/i18n";
import { isRecruiterInboxActionable } from "../src/lib/recruiter-inbox-decision";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientSrc = readFileSync(
  join(root, "src/app/recruiter/inbox/recruiter-inbox-client.tsx"),
  "utf8",
);
const matchScoreSrc = readFileSync(
  join(root, "src/components/recruiter/recruiter-match-score-card.tsx"),
  "utf8",
);
const decisionRailSrc = readFileSync(
  join(root, "src/components/recruiter/recruiter-decision-rail.tsx"),
  "utf8",
);
const signalListSrc = readFileSync(
  join(root, "src/components/recruiter/recruiter-signal-list.tsx"),
  "utf8",
);

test("match score card exposes label, value and tone as separate elements", () => {
  assert.match(matchScoreSrc, /recruiterInboxMatchScoreLabelClass/);
  assert.match(matchScoreSrc, /recruiterInboxMatchScoreValueClass/);
  assert.match(matchScoreSrc, /recruiterInboxMatchScoreToneClass/);
  assert.match(matchScoreSrc, /Math\.round\(score\)/);
  assert.doesNotMatch(matchScoreSrc, /dominant: true/);
  assert.equal(RECRUITER_INBOX_VISUAL_MARKERS.matchScoreLabel, "recruiter-inbox-match-score-label");
  assert.equal(RECRUITER_INBOX_VISUAL_MARKERS.matchScoreValue, "recruiter-inbox-match-score-value");
  assert.equal(RECRUITER_INBOX_VISUAL_MARKERS.matchScoreTone, "recruiter-inbox-match-score-tone");
});

test("decision rail uses dedicated panel marker and hosts match score + CTA", () => {
  assert.match(decisionRailSrc, /recruiterInboxDecisionRailClass/);
  assert.match(decisionRailSrc, /RecruiterMatchScoreCard/);
  assert.match(decisionRailSrc, /recruiterInboxReviewCardCtaClass/);
  assert.equal(RECRUITER_INBOX_VISUAL_MARKERS.decisionRail, "recruiter-inbox-decision-rail");
  assert.match(clientSrc, /RecruiterDecisionRail/);
});

test("review CTA uses short secondary copy with cyan accent styling", () => {
  assert.match(clientSrc, /recruiterInbox\.reviewCardCtaShort/);
  const visualSrc = readFileSync(join(root, "src/lib/recruiter-inbox-visual.ts"), "utf8");
  assert.match(visualSrc, /border-cyan-400/);
  assert.match(visualSrc, /recruiter-inbox-review-card-cta/);
});

test("signal rows replace chip blobs with positive and verification markers", () => {
  const visualSrc = readFileSync(join(root, "src/lib/recruiter-inbox-visual.ts"), "utf8");
  assert.match(signalListSrc, /recruiterInboxSignalRowClass/);
  assert.match(visualSrc, /signalRowPositive/);
  assert.match(visualSrc, /signalRowVerification/);
  assert.match(clientSrc, /RecruiterSignalList/);
  assert.match(clientSrc, /kind: "positive"/);
  assert.match(clientSrc, /\.slice\(0, 2\)/);
});

test("short localized signal labels and PL overflow copy in review card", () => {
  assert.equal(
    shortRecruiterInboxChipText("Candidate target role title aligns with posting", "en"),
    "Role aligns",
  );
  assert.equal(
    shortRecruiterInboxChipText("Candidate target role title aligns with posting", "pl"),
    "Rola pasuje",
  );
  const plOverflow = dictionaries.pl.recruiterInbox.chipOverflowInReviewCard.replace("{count}", "3");
  assert.match(plOverflow, /karcie oceny/);
  assert.match(clientSrc, /chipOverflowInReviewCard/);
});

test("PL card preview avoids long English reason strings", () => {
  const longEn = "Low algorithmic fit — recruiter decision required";
  const plShort = shortRecruiterInboxChipText(longEn, "pl");
  assert.doesNotMatch(plShort, /recruiter decision required/i);
  assert.equal(
    localizeRecruiterInboxChipText(longEn, "pl"),
    "Niska zgodność algorytmiczna — wymagana decyzja rekrutera",
  );
  assert.equal(plShort, "Niskie dopasowanie");
});

test("pending rows show accept/decline; decided rows hide accept; PII note retained", () => {
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.acceptButton/);
  assert.match(clientSrc, /recruiterInboxDeclineButtonClass/);
  assert.match(clientSrc, /actionable \?/);
  assert.match(clientSrc, /recruiterDataVisibilitySummary/);
  assert.equal(isRecruiterInboxActionable("interview"), false);
  assert.equal(isRecruiterInboxActionable("applied"), true);
});

test("PL match score card label is Dopasowanie", () => {
  assert.equal(dictionaries.pl.recruiterInbox.matchScoreCardLabel, "Dopasowanie");
  assert.equal(dictionaries.pl.recruiterInbox.reviewCardCtaShort, "Zobacz kartę oceny");
});
