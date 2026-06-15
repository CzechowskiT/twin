import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  DIGEST_MAX_SECTION_ITEMS,
  RECRUITER_TALENT_RADAR_DIGEST_MARKERS,
  buildDigestCopyText,
} from "../src/lib/recruiter-talent-radar-digest";
import { dictionaries, en, pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const digestLib = readSrc("src/lib/recruiter-talent-radar-digest.ts");
const sectionSrc = readSrc("src/components/recruiter/talent-radar/talent-radar-digest-section.tsx");
const summarySrc = readSrc("src/components/recruiter/talent-radar/talent-radar-digest-summary.tsx");
const copySrc = readSrc("src/components/recruiter/talent-radar/talent-radar-digest-copy-button.tsx");
const clientSrc = readSrc("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");

test("1 section cap at five items", () => {
  assert.equal(DIGEST_MAX_SECTION_ITEMS, 5);
  assert.match(digestLib, /sectionMeta/);
  assert.match(clientSrc, /sectionMeta/);
});

test("2 unique candidate count in summary panel", () => {
  assert.match(summarySrc, /summaryUniqueCandidates/);
  assert.match(summarySrc, /uniqueCandidateCount/);
  assert.match(digestLib, /uniqueCandidateCount/);
});

test("3 draft aggregation fields on candidate type", () => {
  assert.match(digestLib, /draftCount/);
  assert.match(digestLib, /aggregateLabel/);
  assert.match(digestLib, /latestDraftPreparedAt/);
});

test("4 premium section cards with aggregation label", () => {
  assert.match(sectionSrc, /rounded-xl/);
  assert.match(sectionSrc, /digest-aggregate-label/);
  assert.match(sectionSrc, /aggregateLabel/);
});

test("5 more in radar overflow link", () => {
  assert.match(sectionSrc, /digest-more-in-radar/);
  assert.match(sectionSrc, /moreInRadar/);
  assert.match(sectionSrc, /RECRUITER_TALENT_RADAR_ROUTE/);
  assert.equal(pl.recruiterTalentRadarDigest.moreInRadar, "+{count} więcej w Radarze");
});

test("6 recommended next action per item", () => {
  assert.match(sectionSrc, /recommendedNextAction/);
  assert.match(sectionSrc, /actionOpenReviewCard/);
  assert.match(sectionSrc, /actionReviewDraft/);
});

test("7 compact empty states", () => {
  assert.match(sectionSrc, /CompactEmpty/);
  assert.match(sectionSrc, /px-3 py-2 text-xs/);
  assert.doesNotMatch(sectionSrc, /GuidedEmptyState/);
});

test("8 copy summary visible button with copied state", () => {
  assert.match(copySrc, /twin-btn-solid/);
  assert.match(copySrc, /summaryCopiedShort/);
  assert.match(copySrc, /aria-live/);
  assert.equal(pl.recruiterTalentRadarDigest.copySummary, "Kopiuj podsumowanie");
  assert.equal(pl.recruiterTalentRadarDigest.summaryCopiedShort, "Skopiowano");
});

test("9 executive copy text includes unique counts", () => {
  const text = buildDigestCopyText({
    narrative: "Brief",
    disclaimer: en.recruiterTalentRadar.disclaimer,
    summary: {
      candidatesToReview: 3,
      returningFromSnooze: 1,
      shortlistedWithoutFollowUp: 2,
      newRadarDecisions: 5,
      lowCoverageRoles: 0,
      draftsPreparedNotSent: 2,
      draftDecisionCount: 6,
      uniqueCandidateCount: 7,
    },
  });
  assert.match(text, /Unique candidates: 7/);
  assert.match(text, /6 drafts/);
});

test("10 section meta shown count badge", () => {
  assert.match(sectionSrc, /shownCount/);
  assert.match(sectionSrc, /totalCount/);
});

test("11 drafts section passes showNotSent and meta", () => {
  assert.match(clientSrc, /sectionId="draftsPrepared"/);
  assert.match(clientSrc, /showNotSent/);
  assert.match(clientSrc, /sectionMeta\?\.draftsPrepared/);
});

test("12 trust language preserved in digest i18n", () => {
  for (const locale of ["en", "pl"] as const) {
    const block = dictionaries[locale].recruiterTalentRadarDigest;
    assert.match(block.trustNoOutreach, /outreach|outreachu/i);
    assert.match(block.digestNotSent, /not sent|were sent|nie wysłan|nie została wysł/i);
  }
});

test("13 no email send surface in premium digest", () => {
  const blob = [clientSrc, copySrc, digestLib].join("\n");
  assert.doesNotMatch(blob, /send.*email|smtp|weekly.*mail/i);
});

test("14 premium markers exported for sections", () => {
  assert.ok(RECRUITER_TALENT_RADAR_DIGEST_MARKERS.section);
  assert.ok(RECRUITER_TALENT_RADAR_DIGEST_MARKERS.candidateCard);
  assert.match(sectionSrc, /data-section-id/);
});
