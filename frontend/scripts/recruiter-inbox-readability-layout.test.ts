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

test("section labels use readable sentence-case styling, not tiny uppercase", () => {
  assert.match(clientSrc, /RecruiterSignalList/);
  assert.match(clientSrc, /recruiterInbox\.cardWhyReview/);
  for (const loc of ["en", "pl"] as const) {
    const label = dictionaries[loc].recruiterInbox.cardWhyReview;
    assert.ok(label.length > 8);
    assert.doesNotMatch(label, /^[A-Z\s]+$/);
  }
});

test("candidate cards expose content and decision rail zone markers", () => {
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.contentZone/);
  assert.match(clientSrc, /RecruiterDecisionRail/);
  assert.equal(RECRUITER_INBOX_VISUAL_MARKERS.contentZone, "recruiter-inbox-content-zone");
  assert.equal(RECRUITER_INBOX_VISUAL_MARKERS.decisionRail, "recruiter-inbox-decision-rail");
});

test("match score card renders in decision rail with label, value and tone", () => {
  assert.match(clientSrc, /RecruiterDecisionRail/);
  assert.match(clientSrc, /matchScoreCardLabel/);
  const decisionRailSrc = readFileSync(
    join(root, "src/components/recruiter/recruiter-decision-rail.tsx"),
    "utf8",
  );
  assert.match(decisionRailSrc, /RecruiterMatchScoreCard/);
});

test("review card CTA lives in decision rail with short localized copy", () => {
  assert.match(clientSrc, /reviewCardCtaShort/);
  assert.match(clientSrc, /RecruiterDecisionRail/);
});

test("signals are capped at two with short labels and review-card overflow", () => {
  assert.match(clientSrc, /rowEvidencePreview/);
  assert.match(clientSrc, /rowVerificationPreview/);
  assert.match(clientSrc, /\.slice\(0, 2\)/);
  assert.match(clientSrc, /chipOverflowInReviewCard/);
  assert.equal(
    shortRecruiterInboxChipText("Candidate target role title aligns with posting", "en"),
    "Role aligns",
  );
  assert.equal(
    shortRecruiterInboxChipText("Candidate target role title aligns with posting", "pl"),
    "Rola pasuje",
  );
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

test("accept/decline behavior unchanged; decided rows hide accept; PII note retained", () => {
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.acceptButton/);
  assert.match(clientSrc, /recruiterInboxDeclineButtonClass/);
  assert.match(clientSrc, /actionable \?/);
  assert.match(clientSrc, /recruiterDataVisibilitySummary/);
  assert.equal(isRecruiterInboxActionable("interview"), false);
  assert.equal(isRecruiterInboxActionable("applied"), true);
});
