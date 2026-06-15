import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  TALENT_RADAR_VISUAL_MARKERS,
  talentRadarModalOverlayClass,
  talentRadarModalPanelClass,
} from "../src/lib/recruiter-talent-radar-visual";
import { dictionaries, en, pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const modalSrc = readSrc("src/components/recruiter/talent-radar/talent-radar-decision-modals.tsx");
const cardSrc = readSrc("src/components/recruiter/talent-radar/talent-radar-candidate-card.tsx");
const clientSrc = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
const visualSrc = readSrc("src/lib/recruiter-talent-radar-visual.ts");

test("1 strong modal overlay blocks background bleed-through", () => {
  assert.match(talentRadarModalOverlayClass(), /bg-slate-950\/85/);
  assert.match(talentRadarModalOverlayClass(), /backdrop-blur-md/);
  assert.match(modalSrc, /talentRadarModalOverlayClass/);
  assert.match(visualSrc, /TALENT_RADAR_VISUAL_MARKERS\.draftModalOverlay/);
});

test("2 solid opaque modal panel — no glass over message text", () => {
  assert.match(talentRadarModalPanelClass(), /bg-\[var\(--twin-surface\)\]/);
  assert.doesNotMatch(talentRadarModalPanelClass(), /backdrop-blur/);
  assert.match(modalSrc, /TALENT_RADAR_VISUAL_MARKERS\.draftMessageBox/);
  assert.match(visualSrc, /TALENT_RADAR_VISUAL_MARKERS\.draftModalPanel/);
});

test("3 draft modal title and copy-only badge in PL", () => {
  assert.match(pl.recruiterTalentRadar.draftTitle, /nie wysłano/i);
  assert.match(pl.recruiterTalentRadar.draftCopyOnlyBadge, /nie wysłano/i);
  assert.match(modalSrc, /draftCopyOnlyBadge/);
  assert.match(modalSrc, /draftTitle/);
});

test("4 trust note and distinct message box styling", () => {
  assert.match(modalSrc, /draftRecruiterReviewNote/);
  assert.match(modalSrc, /draftMessageBox/);
  assert.match(en.recruiterTalentRadar.draftRecruiterReviewNote.toLowerCase(), /no automatic outreach/);
  assert.match(modalSrc, /whitespace-pre-wrap/);
});

test("5 separated CTA hierarchy: copy primary, review secondary, close tertiary", () => {
  assert.match(modalSrc, /TALENT_RADAR_VISUAL_MARKERS\.draftCtaRow/);
  assert.match(modalSrc, /twin-btn-solid/);
  assert.match(modalSrc, /talentRadarSecondaryCtaClass/);
  assert.match(modalSrc, /talentRadarTertiaryCtaClass/);
  assert.match(modalSrc, /draftCopy/);
  assert.match(modalSrc, /ctaReviewCard/);
  assert.match(modalSrc, /draftClose/);
});

test("6 ESC close and focus trap wired in draft modal", () => {
  assert.match(modalSrc, /useModalA11y/);
  assert.match(modalSrc, /event\.key === "Escape"/);
  assert.match(modalSrc, /document\.body\.style\.overflow = "hidden"/);
  assert.match(modalSrc, /aria-modal="true"/);
});

test("7 premium candidate card header with fit, decision, evidence badges", () => {
  assert.match(cardSrc, /TALENT_RADAR_VISUAL_MARKERS\.candidateCardHeader/);
  assert.match(cardSrc, /TalentRadarFitBadge/);
  assert.match(cardSrc, /TALENT_RADAR_DECISION_MARKERS\.decisionBadge/);
  assert.match(cardSrc, /TALENT_RADAR_VISUAL_MARKERS\.evidenceBadge/);
});

test("8 grouped signal chips with section labels", () => {
  assert.match(cardSrc, /TALENT_RADAR_VISUAL_MARKERS\.candidateCardChipGroup/);
  assert.match(cardSrc, /talentRadarSignalChipClass/);
  assert.match(cardSrc, /whySurfaced/);
  assert.match(cardSrc, /whyNow/);
  assert.match(cardSrc, /ChipGroup/);
});

test("9 nested expanded details panel with evidence, risks, missing data", () => {
  assert.match(cardSrc, /TALENT_RADAR_VISUAL_MARKERS\.candidateCardDetailsPanel/);
  assert.match(cardSrc, /recruiterTalentRadar\.evidence/);
  assert.match(cardSrc, /recruiterTalentRadar\.risks/);
  assert.match(cardSrc, /recruiterTalentRadar\.missingData/);
  assert.match(cardSrc, /expandDetails/);
});

test("10 last decision section in expanded details", () => {
  assert.match(cardSrc, /lastDecision/);
  assert.match(cardSrc, /latest_decision/);
  assert.equal(pl.recruiterTalentRadar.lastDecision, "Ostatnia decyzja");
  assert.equal(en.recruiterTalentRadar.lastDecision, "Last decision");
});

test("11 improved CTA row with primary and secondary tiers", () => {
  assert.match(cardSrc, /TALENT_RADAR_VISUAL_MARKERS\.candidateCardCtaRow/);
  assert.match(cardSrc, /talentRadarPrimaryCtaClass/);
  assert.match(cardSrc, /talentRadarSecondaryCtaClass/);
  assert.match(cardSrc, /talentRadarTertiaryCtaClass/);
});

test("12 page spacing polish and trust footer", () => {
  assert.match(clientSrc, /TALENT_RADAR_VISUAL_MARKERS\.trustFooter/);
  assert.match(clientSrc, /trustFooter/);
  assert.match(clientSrc, /pb-12/);
  assert.match(clientSrc, /mt-10/);
  assert.ok(dictionaries.pl.recruiterTalentRadar.trustFooter.length > 20);
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:recruiter-talent-radar-visual-polish/);
  assert.equal(TALENT_RADAR_VISUAL_MARKERS.trustFooter, "recruiter-talent-radar-trust-footer");
  assert.match(visualSrc, /talentRadarTertiaryCtaClass/);
});
