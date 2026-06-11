import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  RECRUITER_INBOX_VISUAL_MARKERS,
  recruiterInboxDeclineButtonClass,
  recruiterInboxMatchScoreCardClass,
  recruiterInboxMatchScoreLabelClass,
  recruiterInboxMatchScoreToneClass,
  recruiterInboxMatchScoreValueClass,
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
const visualSrc = readFileSync(join(root, "src/lib/recruiter-inbox-visual.ts"), "utf8");

const FORBIDDEN_DARK_TONE_TEXT = /dark:text-(amber|cyan|rose|teal|emerald|sky)-/;

function assertNoForbiddenDarkToneText(className: string, label: string): void {
  assert.doesNotMatch(
    className,
    FORBIDDEN_DARK_TONE_TEXT,
    `${label} must not use colored text on dark backgrounds`,
  );
}

function assertNearWhiteDarkText(className: string, label: string): void {
  assert.match(
    className,
    /dark:text-(white|slate-100|rose-50|rose-100)/,
    `${label} must use white or near-white text on dark`,
  );
}

test("match score label, value and tone use high-contrast text — tone color on border/bg only", () => {
  assert.match(recruiterInboxMatchScoreLabelClass(), /dark:text-slate-3/);
  assert.match(recruiterInboxMatchScoreValueClass(), /dark:text-white/);
  for (const tone of ["high", "medium", "low", "unknown"] as const) {
    const toneCls = recruiterInboxMatchScoreToneClass(tone);
    assertNoForbiddenDarkToneText(toneCls, `match score tone (${tone})`);
    assert.match(toneCls, /dark:text-(white|slate-)/);
  }
  assert.match(recruiterInboxMatchScoreCardClass("low"), /border-amber-/);
  assert.match(recruiterInboxMatchScoreCardClass("low"), /bg-amber-/);
  assert.doesNotMatch(recruiterInboxMatchScoreToneClass("low"), /text-amber-/);
});

test("review CTA uses white/near-white dark text and cyan accent on border/bg/icon", () => {
  const cta = recruiterInboxReviewCardCtaClass();
  assert.match(cta, /recruiter-inbox-review-card-cta/);
  assertNearWhiteDarkText(cta, "review CTA");
  assert.match(cta, /border-cyan-/);
  assert.match(cta, /bg-cyan-/);
  assert.match(cta, /focus-visible:ring-cyan-/);
  assertNoForbiddenDarkToneText(cta, "review CTA");
  assert.match(recruiterInboxReviewCardCtaIconClass(), /text-cyan-/);
  assert.match(decisionRailSrc, /recruiterInboxReviewCardCtaIconClass/);
});

test("pending status badge uses white/near-white text; cyan on border/bg only", () => {
  const awaiting = recruiterInboxStatusBadgeClass("awaiting");
  assert.match(awaiting, /recruiter-inbox-status-badge/);
  assertNearWhiteDarkText(awaiting, "awaiting status");
  assert.match(awaiting, /border-cyan-/);
  assert.match(awaiting, /bg-cyan-/);
  assertNoForbiddenDarkToneText(awaiting, "awaiting status");
});

test("decline button is readable destructive — white text, rose border/bg", () => {
  const decline = recruiterInboxDeclineButtonClass();
  assert.match(decline, /recruiter-inbox-decline-btn/);
  assertNearWhiteDarkText(decline, "decline");
  assert.match(decline, /border-rose-/);
  assert.match(decline, /bg-rose-/);
  assert.match(decline, /focus-visible:ring-rose-/);
  assertNoForbiddenDarkToneText(decline, "decline");
});

test("active rail controls avoid muted/disabled-looking dark text tokens", () => {
  const activeClasses = [
    recruiterInboxReviewCardCtaClass(),
    recruiterInboxDeclineButtonClass(),
    recruiterInboxStatusBadgeClass("awaiting"),
    recruiterInboxMatchScoreLabelClass(),
    recruiterInboxMatchScoreValueClass(),
    recruiterInboxMatchScoreToneClass("low"),
  ];
  for (const cls of activeClasses) {
    assert.doesNotMatch(cls, /dark:text-\[var\(--twin-muted/);
    assert.doesNotMatch(cls, /dark:text-slate-[45]00/);
    assert.doesNotMatch(cls, /dark:opacity-/);
  }
});

test("accept remains primary twin-btn-solid on actionable rows", () => {
  assert.match(clientSrc, /RECRUITER_INBOX_VISUAL_MARKERS\.acceptButton/);
  assert.match(clientSrc, /twin-btn-solid/);
  assert.match(clientSrc, /actionable \?/);
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

test("decision rail shell uses lighter fill and slimmer padding", () => {
  assert.match(visualSrc, /recruiterInboxDecisionRailClass/);
  assert.match(visualSrc, /bg-\[var\(--twin-surface-2\)\]\/20/);
  assert.match(visualSrc, /p-3\.5/);
});
