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

/** Studio theme uses data-marketing-surface, not Tailwind .dark — dark: text never applies. */
const FORBIDDEN_LOW_CONTRAST_TEXT =
  /text-(amber|cyan|rose|teal|emerald|sky)-(700|800|900|950)|text-slate-(600|700|800|900)/;

const FORBIDDEN_DARK_TEXT_ONLY = /dark:text-(amber|cyan|rose|teal|emerald|sky|slate|white)/;

function assertNoLowContrastText(className: string, label: string): void {
  assert.doesNotMatch(
    className,
    FORBIDDEN_LOW_CONTRAST_TEXT,
    `${label} must not use low-contrast Tailwind text on dark studio surfaces`,
  );
}

function assertThemeAwareText(className: string, label: string): void {
  assert.match(
    className,
    /text-\[var\(--(foreground|twin-muted-strong)\)\]/,
    `${label} must use CSS variable text (studio has light --foreground without .dark class)`,
  );
}

test("match score label, value and tone use theme-aware text — tone color on border/bg only", () => {
  assertThemeAwareText(recruiterInboxMatchScoreLabelClass(), "match score label");
  assertThemeAwareText(recruiterInboxMatchScoreValueClass(), "match score value");
  for (const tone of ["high", "medium", "low", "unknown"] as const) {
    const toneCls = recruiterInboxMatchScoreToneClass(tone);
    assertNoLowContrastText(toneCls, `match score tone (${tone})`);
    assertThemeAwareText(toneCls, `match score tone (${tone})`);
    assert.doesNotMatch(toneCls, /text-(amber|cyan|emerald|sky)-/);
  }
  assert.match(recruiterInboxMatchScoreCardClass("low"), /border-amber-/);
  assert.match(recruiterInboxMatchScoreCardClass("low"), /bg-amber-/);
  assert.doesNotMatch(recruiterInboxMatchScoreToneClass("low"), /text-amber-/);
});

test("review CTA uses foreground text and cyan accent on border/bg/icon only", () => {
  const cta = recruiterInboxReviewCardCtaClass();
  assert.match(cta, /recruiter-inbox-review-card-cta/);
  assertThemeAwareText(cta, "review CTA");
  assertNoLowContrastText(cta, "review CTA");
  assert.match(cta, /border-cyan-/);
  assert.match(cta, /bg-cyan-/);
  assert.match(cta, /focus-visible:ring-cyan-/);
  assert.match(recruiterInboxReviewCardCtaIconClass(), /text-cyan-3/);
  assert.doesNotMatch(recruiterInboxReviewCardCtaIconClass(), /dark:text-/);
  assert.match(decisionRailSrc, /recruiterInboxReviewCardCtaIconClass/);
});

test("pending status badge uses foreground text; cyan on border/bg only", () => {
  const awaiting = recruiterInboxStatusBadgeClass("awaiting");
  assert.match(awaiting, /recruiter-inbox-status-badge/);
  assertThemeAwareText(awaiting, "awaiting status");
  assertNoLowContrastText(awaiting, "awaiting status");
  assert.match(awaiting, /border-cyan-/);
  assert.match(awaiting, /bg-cyan-/);
});

test("decline button is readable destructive — foreground text, rose border/bg", () => {
  const decline = recruiterInboxDeclineButtonClass();
  assert.match(decline, /recruiter-inbox-decline-btn/);
  assertThemeAwareText(decline, "decline");
  assertNoLowContrastText(decline, "decline");
  assert.match(decline, /border-rose-/);
  assert.match(decline, /bg-rose-/);
  assert.match(decline, /focus-visible:ring-rose-/);
});

test("decision rail tokens do not rely on Tailwind dark: for readable text", () => {
  const railTextFns = [
    recruiterInboxReviewCardCtaClass(),
    recruiterInboxDeclineButtonClass(),
    recruiterInboxStatusBadgeClass("awaiting"),
    recruiterInboxMatchScoreLabelClass(),
    recruiterInboxMatchScoreValueClass(),
    recruiterInboxMatchScoreToneClass("low"),
  ];
  for (const cls of railTextFns) {
    assert.doesNotMatch(
      cls,
      FORBIDDEN_DARK_TEXT_ONLY,
      "rail text must not depend on dark: variants (studio uses data-marketing-surface)",
    );
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
  assert.match(visualSrc, /bg-\[var\(--twin-surface-raised\)\]\/25/);
  assert.match(visualSrc, /p-3[^.]/);
});
