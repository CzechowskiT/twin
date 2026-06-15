import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  computeTalentRadarSummaryStats,
  groupTalentRadarCandidates,
  talentRadarFitBandFromScore,
  talentRadarReviewGroup,
  TALENT_RADAR_VISUAL_MARKERS,
} from "../src/lib/recruiter-talent-radar-visual";
import { RECRUITER_TALENT_RADAR_MARKERS } from "../src/lib/recruiter-talent-radar";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const clientSrc = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
const visualSrc = readSrc("src/lib/recruiter-talent-radar-visual.ts");
const cardSrc = readSrc("src/components/recruiter/talent-radar/talent-radar-candidate-card.tsx");
const groupsSrc = readSrc("src/components/recruiter/talent-radar/talent-radar-candidate-groups.tsx");
const summarySrc = readSrc("src/components/recruiter/talent-radar/talent-radar-summary-panel.tsx");
const filterSrc = readSrc("src/components/recruiter/talent-radar/talent-radar-filter-toolbar.tsx");
const badgeSrc = readSrc("src/components/recruiter/talent-radar/talent-radar-fit-badge.tsx");

const sampleStrong = {
  id: "1",
  display_name: "Alex",
  fit_label: "strong" as const,
  score: 85,
  status: "ready_to_review" as const,
  why_surfaced: ["Skill overlap", "Prior shortlist"],
  why_now: ["No contact 90 days"],
  evidence: ["Skill overlap"],
  risks: ["Needs review"],
  missing_data: [],
  recommended_next_action: "open_review_card" as const,
  data_confidence: "high" as const,
  human_decision_required: true as const,
};

const sampleVerification = {
  ...sampleStrong,
  id: "2",
  score: 72,
  status: "needs_verification" as const,
};

test("1 summary panel with cockpit stats markers", () => {
  assert.match(clientSrc, /TalentRadarSummaryPanel/);
  assert.match(summarySrc, /TALENT_RADAR_VISUAL_MARKERS\.summaryPanel/);
  assert.match(summarySrc, /summaryCandidates/);
  assert.match(summarySrc, /summaryStrong/);
  assert.match(summarySrc, /summaryVerification/);
  assert.match(summarySrc, /summaryLowConfidence/);
  assert.match(summarySrc, /summaryNoAutoOutreach/);
  const stats = computeTalentRadarSummaryStats([sampleStrong, sampleVerification]);
  assert.equal(stats.total, 2);
  assert.equal(stats.strongMatches, 1);
  assert.equal(stats.needsVerification, 1);
});

test("2 fit score bands 80/60/40 with visual badges", () => {
  assert.equal(talentRadarFitBandFromScore(85), "strong");
  assert.equal(talentRadarFitBandFromScore(65), "good");
  assert.equal(talentRadarFitBandFromScore(45), "possible");
  assert.equal(talentRadarFitBandFromScore(20), "low");
  assert.match(badgeSrc, /TalentRadarFitBadge/);
  assert.match(badgeSrc, /talentRadarFitBadgeClass/);
  assert.match(visualSrc, /80/);
  assert.match(visualSrc, /60/);
  assert.match(visualSrc, /40/);
});

test("3 candidate groups with PL decision cockpit labels", () => {
  const buckets = groupTalentRadarCandidates([sampleStrong, sampleVerification]);
  assert.equal(talentRadarReviewGroup(sampleStrong), "review_first");
  assert.equal(talentRadarReviewGroup(sampleVerification), "needs_verification");
  assert.equal(buckets.review_first.length, 1);
  assert.equal(buckets.needs_verification.length, 1);
  assert.match(groupsSrc, /TalentRadarCandidateGroups/);
  assert.match(groupsSrc, /groupReviewFirst/);
  assert.match(groupsSrc, /groupPossibleMatch/);
  assert.match(groupsSrc, /groupNeedsVerification/);
  assert.match(groupsSrc, /groupLowConfidence/);
  assert.equal(dictionaries.pl.recruiterTalentRadar.groupReviewFirst, "Najpierw sprawdź");
  assert.equal(dictionaries.pl.recruiterTalentRadar.groupPossibleMatch, "Możliwe dopasowanie");
});

test("4 scannable cards: header, why surfaced/now limits, expandable details", () => {
  assert.match(cardSrc, /candidateCardHeader/);
  assert.match(cardSrc, /\.slice\(0, 2\)/);
  assert.match(cardSrc, /expandDetails/);
  assert.match(cardSrc, /candidateCardDetails/);
  assert.match(cardSrc, /talentRadarSignalChipClass/);
});

test("5 CTA hierarchy: primary review card, secondary draft-only actions", () => {
  assert.match(cardSrc, /talentRadarPrimaryCtaClass/);
  assert.match(cardSrc, /talentRadarSecondaryCtaClass/);
  assert.match(cardSrc, /ctaReviewCard/);
  assert.match(cardSrc, /ctaDraft/);
  assert.doesNotMatch(clientSrc, /send.*email|auto.*send|wyslij.*wiadom/i);
  assert.equal(TALENT_RADAR_VISUAL_MARKERS.primaryCta, "recruiter-talent-radar-primary-cta");
});

test("6 premium filter toolbar with helper text", () => {
  assert.match(clientSrc, /TalentRadarFilterToolbar/);
  assert.match(filterSrc, /filterToolbarTitle/);
  assert.match(filterSrc, /filterToolbarHelper/);
  assert.match(filterSrc, /talentRadarFilterToolbarClass/);
});

test("7 preserved premium empty state and disclaimer", () => {
  assert.match(clientSrc, /RECRUITER_TALENT_RADAR_MARKERS\.emptyState/);
  assert.match(clientSrc, /GuidedEmptyState/);
  assert.match(clientSrc, /RECRUITER_TALENT_RADAR_MARKERS\.disclaimer/);
  assert.ok(en.recruiterTalentRadar.emptyTitle.length > 10);
});

test("8 workspace dark studio card styling tokens", () => {
  assert.match(visualSrc, /talentRadarCandidateCardClass/);
  assert.match(visualSrc, /--twin-surface/);
  assert.match(visualSrc, /backdrop-blur/);
  assert.match(cardSrc, /talentRadarCandidateCardClass/);
});

test("9 markers wired for regression", () => {
  assert.match(clientSrc, /TalentRadarSummaryPanel/);
  assert.match(clientSrc, /TalentRadarCandidateGroups/);
  assert.match(summarySrc, /RECRUITER_TALENT_RADAR_MARKERS\.summaryPanel|TALENT_RADAR_VISUAL_MARKERS\.summaryPanel/);
  assert.equal(RECRUITER_TALENT_RADAR_MARKERS.candidateGroup, "recruiter-talent-radar-candidate-group");
});

test("10 no forbidden AI-decides or auto outreach copy in new keys", () => {
  const blob = JSON.stringify(en.recruiterTalentRadar);
  assert.doesNotMatch(blob, /ai (chose|selected|picks)/i);
  assert.doesNotMatch(blob, /automatically contact/i);
  assert.match(en.recruiterTalentRadar.summaryNoAutoOutreach.toLowerCase(), /no automatic outreach/);
});

test("11 PL summary labels match cockpit spec", () => {
  const pl = dictionaries.pl.recruiterTalentRadar;
  assert.equal(pl.summaryCandidates, "Kandydaci");
  assert.equal(pl.summaryStrong, "Mocne dopasowania");
  assert.equal(pl.summaryVerification, "Do weryfikacji");
  assert.equal(pl.summaryLowConfidence, "Niska pewność");
});

test("12 docs reference premium UX test script", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:recruiter-talent-radar-premium-ux/);
  const doc = readFileSync(
    join(root, "..", "docs", "RECRUITER_TALENT_RADAR_MVP_2026-06-12.md"),
    "utf8",
  );
  assert.match(doc, /test:recruiter-talent-radar-premium-ux/);
});
