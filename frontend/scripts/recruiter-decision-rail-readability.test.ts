import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  RECRUITER_INBOX_VISUAL_MARKERS,
  recruiterInboxDeclineButtonClass,
  recruiterInboxMatchScoreLabelClass,
  recruiterInboxMatchScoreToneClass,
  recruiterInboxReviewCardCtaClass,
  recruiterInboxReviewCardCtaIconClass,
  recruiterInboxStatusBadgeClass,
} from "../src/lib/recruiter-inbox-visual";
import { en, dictionaries } from "../src/lib/i18n";
import { isRecruiterInboxActionable } from "../src/lib/recruiter-inbox-decision";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientSrc = readFileSync(
  join(root, "src/app/recruiter/inbox/recruiter-inbox-client.tsx"),
  "utf8",
);
const decisionRailSrc = readFileSync(
  join(root, "src/components/recruiter/recruiter-decision-rail.tsx"),
  "utf8",
);

test("review CTA uses near-white dark text and cyan accent on border/bg/icon", () => {
  const cta = recruiterInboxReviewCardCtaClass();
  assert.match(cta, /recruiter-inbox-review-card-cta/);
  assert.match(cta, /dark:text-slate-100/);
  assert.match(cta, /border-cyan-/);
  assert.match(cta, /focus-visible:ring-cyan-/);
  assert.doesNotMatch(cta, /dark:text-cyan-/);
  assert.match(recruiterInboxReviewCardCtaIconClass(), /text-cyan-/);
  assert.match(decisionRailSrc, /recruiterInboxReviewCardCtaIconClass/);
});

test("pending status badge uses high-contrast near-white text on dark", () => {
  const awaiting = recruiterInboxStatusBadgeClass("awaiting");
  assert.match(awaiting, /recruiter-inbox-status-badge/);
  assert.match(awaiting, /dark:text-white/);
  assert.match(awaiting, /border-cyan-/);
  assert.match(awaiting, /bg-cyan-/);
  assert.doesNotMatch(awaiting, /dark:text-cyan-/);
});

test("decline button is readable destructive — white text, stronger rose border/bg", () => {
  const decline = recruiterInboxDeclineButtonClass();
  assert.match(decline, /recruiter-inbox-decline-btn/);
  assert.match(decline, /dark:text-white/);
  assert.match(decline, /border-rose-/);
  assert.match(decline, /bg-rose-/);
  assert.match(decline, /focus-visible:ring-rose-/);
});

test("accept remains primary twin-btn-solid on actionable rows", () => {
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.acceptButton/);
  assert.match(clientSrc, /twin-btn-solid/);
  assert.match(clientSrc, /actionable \?/);
});

test("match score label and tone stay high-contrast on dark", () => {
  assert.match(recruiterInboxMatchScoreLabelClass(), /dark:text-slate-200/);
  assert.match(recruiterInboxMatchScoreToneClass("high"), /dark:text-slate-100/);
  assert.match(recruiterInboxMatchScoreToneClass("medium"), /dark:text-slate-100/);
});

test("decided rows hide accept; PII note retained; forbidden claims absent", () => {
  assert.equal(isRecruiterInboxActionable("interview"), false);
  assert.equal(isRecruiterInboxActionable("rejected"), false);
  assert.match(clientSrc, /recruiterDataVisibilitySummary/);
  assert.match(clientSrc, /actionable \?/);
  const blob = JSON.stringify(en.recruiterInbox).toLowerCase();
  assert.doesNotMatch(blob, /ai decides|best candidate|guaranteed fit|automatic decision/);
});

test("PL copy for pending status and review CTA unchanged", () => {
  assert.equal(dictionaries.pl.recruiterInbox.reviewCardCtaShort, "Zobacz kartę oceny");
  assert.equal(dictionaries.pl.recruiterInbox.statusAwaitingDecision, "Oczekuje decyzji");
  assert.equal(RECRUITER_INBOX_VISUAL_MARKERS.reviewCardCta, "recruiter-inbox-review-card-cta");
});
