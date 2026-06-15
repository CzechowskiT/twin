import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  RECRUITER_TALENT_RADAR_DIGEST_MARKERS,
  RECRUITER_TALENT_RADAR_DIGEST_ROUTE,
  buildDigestCopyText,
} from "../src/lib/recruiter-talent-radar-digest";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const FORBIDDEN_COPY = [
  /\bai selected the best candidate\b/i,
  /\bguaranteed fit\b/i,
  /\bautomatically contact\b/i,
  /\bwe contacted\b/i,
  /\bemail sent\b/i,
  /\bautomatic outreach\b/i,
  /\bwyslano wiadomosc\b/i,
  /\bautomatyczny outreach\b/i,
];

test("1 digest route exists", () => {
  assert.equal(RECRUITER_TALENT_RADAR_DIGEST_ROUTE, "/recruiter/talent-radar/digest");
  assert.match(readSrc("src/app/recruiter/talent-radar/digest/page.tsx"), /RecruiterTalentRadarDigestClient/);
  assert.match(readSrc("src/app/api/recruiter/talent-radar/digest/route.ts"), /talent-radar\/digest/);
});

test("2 recruiter hub links to digest", () => {
  const mod = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "talent_radar_digest");
  assert.ok(mod);
  assert.equal(mod.href, "/recruiter/talent-radar/digest");
  assert.equal(mod.status, "pilot");
});

test("3 talent radar links to digest", () => {
  const client = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  assert.match(client, /RECRUITER_TALENT_RADAR_DIGEST_ROUTE/);
  assert.match(client, /recruiter-talent-radar-digest-link/);
});

test("4 digest hero renders pilot and trust chips", () => {
  const client = readSrc("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");
  assert.match(client, /RECRUITER_TALENT_RADAR_DIGEST_MARKERS\.hero/);
  assert.match(client, /RECRUITER_TALENT_RADAR_DIGEST_MARKERS\.statusChips/);
  assert.match(client, /chipPilot/);
  assert.match(client, /chipHumanReview/);
  assert.match(client, /chipNoAutoOutreach/);
});

test("5 summary cards render", () => {
  assert.match(
    readSrc("src/components/recruiter/talent-radar/talent-radar-digest-summary.tsx"),
    /RECRUITER_TALENT_RADAR_DIGEST_MARKERS\.summaryPanel/,
  );
});

test("6 review-first section or empty state", () => {
  const client = readSrc("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");
  assert.match(client, /sectionReviewFirst/);
  assert.match(client, /sectionReviewFirstEmpty/);
});

test("7 returning-from-snooze section or empty state", () => {
  const client = readSrc("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");
  assert.match(client, /sectionReturningSnooze/);
  assert.match(client, /sectionReturningSnoozeEmpty/);
});

test("8 shortlist-without-follow-up section or empty state", () => {
  const client = readSrc("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");
  assert.match(client, /sectionShortlistNoFollowUp/);
  assert.match(client, /sectionShortlistNoFollowUpEmpty/);
});

test("9 dismissed patterns aggregate by default", () => {
  const client = readSrc("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");
  const section = readSrc("src/components/recruiter/talent-radar/talent-radar-digest-section.tsx");
  assert.match(client, /sectionDismissedPatterns/);
  assert.match(section, /kind === "dismissed"/);
  assert.doesNotMatch(section, /display_name|email|phone/i);
});

test("10 drafts prepared section says not sent", () => {
  const section = readSrc("src/components/recruiter/talent-radar/talent-radar-digest-section.tsx");
  assert.match(section, /draftNotSent/);
  assert.match(section, /showNotSent/);
});

test("11 copy digest button exists without email send", () => {
  const copyBtn = readSrc("src/components/recruiter/talent-radar/talent-radar-digest-copy-button.tsx");
  assert.match(copyBtn, /RECRUITER_TALENT_RADAR_DIGEST_MARKERS\.copyButton/);
  assert.match(copyBtn, /clipboard\.writeText/);
  assert.doesNotMatch(copyBtn, /send.*email|mail\(|smtp/i);
  const text = buildDigestCopyText({
    narrative: "Test",
    disclaimer: en.recruiterTalentRadar.disclaimer,
    summary: {
      candidatesToReview: 1,
      returningFromSnooze: 0,
      shortlistedWithoutFollowUp: 0,
      newRadarDecisions: 0,
      lowCoverageRoles: 0,
      draftsPreparedNotSent: 0,
    },
  });
  assert.match(text.toLowerCase(), /recruiter decides|no automatic outreach/i);
});

test("12 no auto-send email endpoint in digest surface", () => {
  const blob = [
    readSrc("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx"),
    readSrc("src/app/api/recruiter/talent-radar/digest/route.ts"),
    readSrc("src/lib/recruiter-talent-radar-digest.ts"),
  ].join("\n");
  assert.doesNotMatch(blob, /send.*email|auto.*send|weekly.*mail|smtp/i);
});

test("13 forbidden language absent from digest i18n", () => {
  const trustAllow = /no automatic outreach|bez automatycznego outreachu|did not send|nie wysłał|not sent|nie wysłano/i;
  for (const locale of LOCALES) {
    const block = dictionaries[locale].recruiterTalentRadarDigest;
    for (const [key, value] of Object.entries(block)) {
      if (trustAllow.test(value)) continue;
      for (const pattern of FORBIDDEN_COPY) {
        assert.doesNotMatch(value, pattern, `${locale}.${key} forbidden copy`);
      }
    }
  }
});

test("14 data-quality warnings visible", () => {
  const client = readSrc("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");
  assert.match(client, /RECRUITER_TALENT_RADAR_DIGEST_MARKERS\.warnings/);
  assert.match(client, /dataQualityWarnings/);
});

test("15 digest links back to talent radar", () => {
  const client = readSrc("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");
  const section = readSrc("src/components/recruiter/talent-radar/talent-radar-digest-section.tsx");
  assert.match(client, /backToRadar/);
  assert.match(section, /RECRUITER_TALENT_RADAR_ROUTE/);
});

test("16 premium empty state", () => {
  const client = readSrc("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");
  assert.match(client, /RECRUITER_TALENT_RADAR_DIGEST_MARKERS\.emptyState/);
  assert.match(client, /GuidedEmptyState/);
  assert.match(client, /emptyActionRadar/);
});

test("17 auth gate remains intact", () => {
  const client = readSrc("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");
  assert.match(client, /RecruiterAccessFields/);
  assert.match(client, /missingAuth/);
  assert.match(readSrc("src/app/api/recruiter/talent-radar/digest/route.ts"), /recruiterInboxProxyGate/);
});

test("digest markers exported", () => {
  assert.ok(RECRUITER_TALENT_RADAR_DIGEST_MARKERS.page);
  assert.ok(RECRUITER_TALENT_RADAR_DIGEST_MARKERS.narrative);
});
