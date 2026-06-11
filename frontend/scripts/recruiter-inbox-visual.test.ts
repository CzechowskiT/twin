import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  RECRUITER_INBOX_VISUAL_MARKERS,
  recruiterInboxMatchScoreBadgeClass,
  recruiterInboxMatchScoreTone,
} from "../src/lib/recruiter-inbox-visual";
import { en, dictionaries } from "../src/lib/i18n";
import { isRecruiterInboxActionable } from "../src/lib/recruiter-inbox-decision";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientSrc = readFileSync(
  join(root, "src/app/recruiter/inbox/recruiter-inbox-client.tsx"),
  "utf8",
);

test("match score tone maps labels and scores for decision-grade badges", () => {
  assert.equal(recruiterInboxMatchScoreTone(88, "excellent"), "high");
  assert.equal(recruiterInboxMatchScoreTone(68, "good"), "medium");
  assert.equal(recruiterInboxMatchScoreTone(42, "possible"), "low");
  assert.equal(recruiterInboxMatchScoreTone(null, null), "unknown");
});

test("match score badge classes use high-contrast palette tokens", () => {
  for (const tone of ["high", "medium", "low", "unknown"] as const) {
    const cls = recruiterInboxMatchScoreBadgeClass(tone);
    assert.match(cls, /border-/);
    assert.doesNotMatch(cls, /opacity-0|text-transparent/);
  }
});

test("decision console exposes premium visual markers and review card CTA copy", () => {
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.decisionConsoleHeader/);
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.segmentTab/);
  assert.match(clientSrc, /recruiterInboxMatchScoreBadgeClass/);
  assert.match(clientSrc, /recruiterInboxMatchScoreTone/);
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.reviewCardCta/);
  assert.match(clientSrc, /recruiterInbox\.openReviewCard/);
  assert.match(clientSrc, /recruiterInbox\.cardWhyReview/);
  assert.match(clientSrc, /recruiterInbox\.decisionConsoleTrustLine/);
  assert.match(clientSrc, /statStrongFit/);
  assert.match(clientSrc, /statGoodFit/);
  assert.equal(RECRUITER_INBOX_VISUAL_MARKERS.decisionConsoleHeader, "recruiter-inbox-decision-header");
});

test("PL and EN include open review card and sharper decision console subcopy", () => {
  for (const locale of ["en", "pl"] as const) {
    const inbox = dictionaries[locale].recruiterInbox;
    assert.ok(inbox.openReviewCard.trim());
    assert.ok(inbox.cardWhyReview.trim());
    assert.match(inbox.decisionConsoleTrustLine.toLowerCase(), /ai|ranking/);
    assert.match(inbox.decisionConsoleTrustLine.toLowerCase(), /recruiter|rekrutera/);
    assert.match(inbox.decisionConsoleSubcopy.toLowerCase(), /review|oceny|signals|sygnał/);
  }
});

test("decided rows remain non-actionable while accept marker stays on actionable rows only", () => {
  assert.equal(isRecruiterInboxActionable("interview"), false);
  assert.equal(isRecruiterInboxActionable("rejected"), false);
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.acceptButton/);
  assert.match(clientSrc, /actionable \?/);
});

test("forbidden trust claims stay out of recruiter inbox copy", () => {
  const blob = JSON.stringify(en.recruiterInbox).toLowerCase();
  assert.doesNotMatch(blob, /ai decides|best candidate|guaranteed fit|automatic decision/);
});
