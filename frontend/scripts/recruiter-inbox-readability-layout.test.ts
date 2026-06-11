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
  assert.match(clientSrc, /recruiterInboxSectionLabelClass/);
  assert.match(clientSrc, /recruiterInbox\.cardWhyReview/);
  assert.doesNotMatch(
    clientSrc,
    /cardWhyReview[\s\S]{0,120}uppercase tracking-wide/,
  );
  for (const loc of ["en", "pl"] as const) {
    const label = dictionaries[loc].recruiterInbox.cardWhyReview;
    assert.ok(label.length > 8);
    assert.doesNotMatch(label, /^[A-Z\s]+$/);
  }
});

test("candidate cards expose content and action zone markers", () => {
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.contentZone/);
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.actionZone/);
  assert.equal(RECRUITER_INBOX_VISUAL_MARKERS.contentZone, "recruiter-inbox-content-zone");
  assert.equal(RECRUITER_INBOX_VISUAL_MARKERS.actionZone, "recruiter-inbox-action-zone");
});

test("match score badge renders inside action zone with dominant sizing", () => {
  const actionBlock = clientSrc.slice(
    clientSrc.indexOf("RECRUITER_INBOX_VISUAL_MARKERS.actionZone"),
    clientSrc.indexOf("RECRUITER_INBOX_VISUAL_MARKERS.actionZone") + 1200,
  );
  assert.match(actionBlock, /recruiterInboxMatchScoreBadgeClass\(scoreTone, \{ dominant: true \}\)/);
});

test("review card CTA lives in action zone with full-width layout", () => {
  const actionStart = clientSrc.indexOf("RECRUITER_INBOX_VISUAL_MARKERS.actionZone");
  const actionEnd = clientSrc.indexOf("</div>", actionStart + 800);
  const actionBlock = clientSrc.slice(actionStart, actionEnd);
  assert.match(actionBlock, /recruiterInboxReviewCardCtaClass/);
  assert.match(actionBlock, /recruiterInbox\.openReviewCard/);
});

test("chips are capped at two with short labels and overflow marker", () => {
  assert.match(clientSrc, /rowEvidencePreview/);
  assert.match(clientSrc, /rowVerificationPreview/);
  assert.match(clientSrc, /\.slice\(0, 2\)/);
  assert.match(clientSrc, /recruiterInboxChipMoreClass/);
  assert.match(clientSrc, /chipMoreCount/);
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
