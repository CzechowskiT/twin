import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  RECRUITER_INBOX_VISUAL_MARKERS,
  recruiterInboxDeclineButtonClass,
  recruiterInboxEvidenceChipClass,
  recruiterInboxMatchScoreBadgeClass,
  recruiterInboxMatchScoreTone,
  recruiterInboxReviewCardCtaClass,
  recruiterInboxStatusBadgeClass,
  recruiterInboxWarningChipClass,
} from "../src/lib/recruiter-inbox-visual";
import { en, dictionaries } from "../src/lib/i18n";
import { isRecruiterInboxActionable } from "../src/lib/recruiter-inbox-decision";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientSrc = readFileSync(
  join(root, "src/app/recruiter/inbox/recruiter-inbox-client.tsx"),
  "utf8",
);
const apiRouteSrc = readFileSync(join(root, "src/app/api/recruiter/inbox/route.ts"), "utf8");

test("match score tone maps labels and scores for decision-grade badges", () => {
  assert.equal(recruiterInboxMatchScoreTone(88, "excellent"), "high");
  assert.equal(recruiterInboxMatchScoreTone(68, "good"), "medium");
  assert.equal(recruiterInboxMatchScoreTone(42, "possible"), "low");
  assert.equal(recruiterInboxMatchScoreTone(null, null), "unknown");
});

test("match score card classes use subtle tone borders without heavy blobs", () => {
  const visualSrc = readFileSync(join(root, "src/lib/recruiter-inbox-visual.ts"), "utf8");
  assert.match(visualSrc, /recruiterInboxMatchScoreCardClass/);
  assert.match(visualSrc, /recruiterInboxMatchScoreLabelClass/);
  assert.match(visualSrc, /recruiterInboxMatchScoreValueClass/);
  assert.match(visualSrc, /recruiterInboxMatchScoreToneClass/);
  for (const tone of ["high", "medium", "low"] as const) {
    const cls = recruiterInboxMatchScoreBadgeClass(tone);
    assert.match(cls, /border-/);
  }
});

test("status, signal rows, review CTA and decline styles use readable dark-theme tokens", () => {
  assert.match(recruiterInboxStatusBadgeClass("awaiting"), /recruiter-inbox-status-badge/);
  assert.match(recruiterInboxStatusBadgeClass("awaiting"), /dark:text-slate-100/);
  assert.match(recruiterInboxEvidenceChipClass(), /recruiter-inbox-evidence-chip/);
  assert.match(recruiterInboxWarningChipClass(), /recruiter-inbox-warning-chip/);
  assert.match(recruiterInboxReviewCardCtaClass(), /recruiter-inbox-review-card-cta/);
  assert.match(recruiterInboxReviewCardCtaClass(), /border-cyan-/);
  assert.match(recruiterInboxReviewCardCtaClass(), /dark:text-white/);
  assert.match(recruiterInboxReviewCardCtaClass(), /focus-visible:ring-cyan-/);
  assert.match(recruiterInboxDeclineButtonClass(), /recruiter-inbox-decline-btn/);
  assert.match(recruiterInboxDeclineButtonClass(), /dark:text-white/);
  assert.match(recruiterInboxDeclineButtonClass(), /focus-visible:ring-rose-/);
});

test("decision console exposes premium visual markers and review card CTA copy", () => {
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.decisionConsoleHeader/);
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.segmentTab/);
  assert.match(clientSrc, /RecruiterDecisionRail/);
  assert.match(clientSrc, /RecruiterSignalList/);
  assert.match(clientSrc, /recruiterInboxDeclineButtonClass/);
  assert.match(clientSrc, /localizeRecruiterInboxChipText/);
  assert.match(clientSrc, /recruiterInbox\.reviewCardCtaShort/);
  assert.match(clientSrc, /recruiterInbox\.cardWhyReview/);
  assert.equal(RECRUITER_INBOX_VISUAL_MARKERS.decisionConsoleHeader, "recruiter-inbox-decision-header");
  assert.equal(RECRUITER_INBOX_VISUAL_MARKERS.decisionRail, "recruiter-inbox-decision-rail");
});

test("inbox API proxy forwards X-Locale for localized chip copy", () => {
  assert.match(apiRouteSrc, /recruiterInboxUpstreamHeaders/);
});

test("PL and EN include review card CTA and sharper decision console subcopy", () => {
  for (const loc of ["en", "pl"] as const) {
    const inbox = dictionaries[loc].recruiterInbox;
    assert.ok(inbox.reviewCardCtaShort.trim());
    assert.ok(inbox.chipOverflowInReviewCard.trim());
    assert.ok(inbox.cardWhyReview.trim());
    assert.match(inbox.decisionConsoleTrustLine.toLowerCase(), /ai|ranking/);
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
