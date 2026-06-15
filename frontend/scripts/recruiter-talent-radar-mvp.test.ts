import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  RECRUITER_TALENT_RADAR_MARKERS,
  RECRUITER_TALENT_RADAR_ROUTE,
  buildOutreachDraftText,
  isTalentRadarWorkspaceScoped,
  talentRadarRowHasForbiddenPii,
} from "../src/lib/recruiter-talent-radar";
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
  /\bbest candidate\b/i,
  /\bhire guaranteed\b/i,
  /\bmillions of candidates\b/i,
  /\blinkedin scraping\b/i,
];

test("1 talent radar route exists", () => {
  assert.equal(RECRUITER_TALENT_RADAR_ROUTE, "/recruiter/talent-radar");
  assert.match(readSrc("src/app/recruiter/talent-radar/page.tsx"), /RecruiterTalentRadarClient/);
  assert.match(readSrc("src/app/api/recruiter/talent-radar/route.ts"), /talent-radar/);
});

test("2 recruiter hub links to talent radar", () => {
  const mod = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "talent_radar");
  assert.ok(mod);
  assert.equal(mod.href, "/recruiter/talent-radar");
  assert.match(readSrc("src/app/recruiter/page.tsx"), /WorkspaceModuleHub/);
});

test("3 talent radar has pilot status on hub", () => {
  const mod = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "talent_radar");
  assert.equal(mod?.status, "pilot");
});

test("4 candidate cards and empty state markers in client", () => {
  const client = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  assert.match(client, /RECRUITER_TALENT_RADAR_MARKERS\.candidateCard/);
  assert.match(client, /RECRUITER_TALENT_RADAR_MARKERS\.emptyState/);
});

test("5-7 explainability sections rendered in client", () => {
  const client = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  assert.match(client, /whySurfaced/);
  assert.match(client, /whyNow/);
  assert.match(client, /risks/);
  assert.match(client, /missingData/);
});

test("8 data confidence shown", () => {
  assert.match(readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx"), /dataConfidence/);
});

test("9 human decision disclaimer visible", () => {
  const client = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  assert.match(client, /humanDecisionRequired/);
  assert.match(client, /RECRUITER_TALENT_RADAR_MARKERS\.disclaimer/);
  assert.match(en.recruiterTalentRadar.disclaimer.toLowerCase(), /recruiter decides/);
});

test("10 no automatic-send CTA", () => {
  const client = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  assert.doesNotMatch(client, /send.*email|auto.*send|wyslij.*wiadom/i);
});

test("11 outreach draft is draft-only", () => {
  const client = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  assert.match(client, /RECRUITER_TALENT_RADAR_MARKERS\.draftPanel/);
  assert.match(en.recruiterTalentRadar.draftNotSent.toLowerCase(), /not sent|nie wysłano/i);
  const draft = buildOutreachDraftText(
    {
      id: "1",
      display_name: "Alex",
      fit_label: "good",
      score: 70,
      status: "ready_to_review",
      why_surfaced: ["Skill overlap"],
      why_now: ["No contact 90 days"],
      evidence: ["Skill overlap"],
      risks: ["Needs review"],
      missing_data: [],
      recommended_next_action: "open_review_card",
      data_confidence: "medium",
      human_decision_required: true,
    },
    "Engineer",
    "en",
  );
  assert.match(draft, /NOT SENT/i);
});

test("12 no hidden PII in sample row guard", () => {
  assert.equal(talentRadarRowHasForbiddenPii({ display_name: "Alex", score: 1 }), false);
  assert.equal(talentRadarRowHasForbiddenPii({ note: "leak email here" }), true);
});

test("13-14 no fake traction or forbidden AI language", () => {
  const blob = JSON.stringify(en.recruiterTalentRadar);
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern);
  }
  assert.match(en.recruiterTalentRadar.scopeBody.toLowerCase(), /no external sourcing|bez zewnętrznego/);
});

test("15 filters render without crash markers", () => {
  assert.match(readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx"), /filtersPanel/);
  assert.match(readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx"), /filterSegment/);
});

test("16 premium empty state copy", () => {
  assert.ok(en.recruiterTalentRadar.emptyTitle.length > 10);
  assert.ok(en.recruiterTalentRadar.emptyActionInbox.length > 0);
});

test("17 recruiter nav includes talent radar", () => {
  assert.match(readSrc("src/components/recruiter/recruiter-workspace-nav.tsx"), /talent-radar/);
});

test("18 existing recruiter routes remain linked", () => {
  const nav = readSrc("src/components/recruiter/recruiter-workspace-nav.tsx");
  assert.match(nav, /\/recruiter\/inbox/);
  assert.match(nav, /\/recruiter\/pipeline/);
  assert.match(nav, /\/recruiter\/analytics/);
  const search = readSrc("src/app/recruiter/search/recruiter-search-client.tsx");
  assert.match(search, /\/recruiter\/inbox/);
});

test("recruiterTalentRadar keys for all locales", () => {
  for (const locale of LOCALES) {
    const copy = dictionaries[locale].recruiterTalentRadar;
    assert.ok(copy.title.length > 0, locale);
    assert.ok(copy.disclaimer.length > 0, locale);
  }
});

test("workspace scoped payload helper", () => {
  assert.equal(
    isTalentRadarWorkspaceScoped({
      summary: { total: 0, scope: "internal_workspace", external_sourcing_connected: false, pilot: true },
    }),
    true,
  );
});

test("launch stance unchanged in matrices", () => {
  const prodMatrix = readFileSync(join(root, "..", "docs", "PRODUCTION_REALITY_MATRIX_2026-05-27.md"), "utf8");
  const launchMatrix = readFileSync(join(root, "..", "docs", "PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md"), "utf8");
  assert.match(prodMatrix, /NO-GO/i);
  assert.match(launchMatrix, /NO-GO/i);
});
