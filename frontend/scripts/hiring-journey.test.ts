/**
 * Hiring journey timeline — route wiring, copy guards, cross-links.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  HIRING_JOURNEY_ALLOWED_NAV_ATTRIBUTES,
  HIRING_JOURNEY_ALLOWED_SAFE_COPY_MARKERS,
  HIRING_JOURNEY_DOC,
  HIRING_JOURNEY_FORBIDDEN_LIVE_ACTION_COPY,
  HIRING_JOURNEY_FORBIDDEN_MUTATION_CONTROLS,
  HIRING_JOURNEY_MARKERS,
  HIRING_JOURNEY_PERSONAS,
  HIRING_JOURNEY_ROUTES,
  HIRING_JOURNEY_STEP_IDS,
  HIRING_JOURNEY_UI_SOURCE_FILES,
  hiringJourneyBoardStepNavBlocked,
  hiringJourneyCandidateAliasNav,
  hiringJourneyCrossLinks,
  hiringJourneyHasAffirmativeForbiddenCopy,
  hiringJourneyHumanReviewStepIds,
  hiringJourneyOverviewLink,
  hiringJourneyPersonaLabelKey,
  hiringJourneySurfacePersona,
  resolveHiringJourney,
} from "../src/lib/hiring-journey";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const ROUTE_FILES = [
  "src/app/dashboard/hiring-journey/page.tsx",
  "src/app/profile/hiring-journey/page.tsx",
  "src/app/recruiter/hiring-journey/page.tsx",
  "src/app/company/hiring-journey/page.tsx",
  "src/app/board/hiring-journey/page.tsx",
] as const;

const ROUTE_SURFACE: Record<(typeof ROUTE_FILES)[number], string> = {
  "src/app/dashboard/hiring-journey/page.tsx": "candidate_dashboard",
  "src/app/profile/hiring-journey/page.tsx": "candidate_profile",
  "src/app/recruiter/hiring-journey/page.tsx": "recruiter",
  "src/app/company/hiring-journey/page.tsx": "company",
  "src/app/board/hiring-journey/page.tsx": "board",
};

const REQUIRED_BLOCKED = [
  /no automatic candidate advancement/i,
  /no interview scheduled/i,
  /no invite sent/i,
  /no email sent/i,
  /no calendar sync/i,
  /no ats writeback/i,
  /no payment/i,
  /no external employer confirmation/i,
] as const;

const FORBIDDEN_COPY = HIRING_JOURNEY_FORBIDDEN_LIVE_ACTION_COPY;

const SECRET_PATTERNS = [/sk_live_/i, /Bearer eyJ/i, /password\s*=\s*["'][^"']+["']/i] as const;

function stripSourceComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 domain data contains four persona variants with eleven steps", () => {
  assert.equal(HIRING_JOURNEY_PERSONAS.length, 4);
  assert.equal(HIRING_JOURNEY_STEP_IDS.length, 11);
  for (const persona of HIRING_JOURNEY_PERSONAS) {
    const journey = resolveHiringJourney(persona);
    assert.equal(journey.persona, persona);
    assert.equal(journey.steps.length, 11);
    assert.ok(journey.blockedActions.length >= 8);
    assert.ok(journey.auditSummary.length >= 7);
  }
});

test("2 all five routes are registered with surface props", () => {
  for (const route of ROUTE_FILES) {
    assert.ok(existsSync(join(root, route)), route);
    const src = read(route);
    assert.match(src, /HiringJourneyTimeline/);
    assert.match(src, new RegExp(`surface="${ROUTE_SURFACE[route]}"`));
  }
  assert.equal(HIRING_JOURNEY_ROUTES.candidate, "/dashboard/hiring-journey");
  assert.equal(HIRING_JOURNEY_ROUTES.profile, "/profile/hiring-journey");
  assert.equal(HIRING_JOURNEY_ROUTES.recruiter, "/recruiter/hiring-journey");
  assert.equal(HIRING_JOURNEY_ROUTES.company, "/company/hiring-journey");
  assert.equal(HIRING_JOURNEY_ROUTES.board, "/board/hiring-journey");
});

test("3 each step has required fields", () => {
  const journey = resolveHiringJourney("candidate");
  for (const step of journey.steps) {
    assert.ok(step.owner);
    assert.ok(step.status);
    assert.ok(step.sourceModuleKey);
    assert.ok(step.evidenceSummaryKey);
    assert.ok(step.provenance);
    assert.ok(step.provenance.evidenceLabelKey);
    assert.equal(typeof step.provenance.humanReviewRequired, "boolean");
    assert.ok(step.nextSafeActionKey);
    assert.ok(step.safetyBoundaryKey);
    assert.ok(step.href.startsWith("/"));
  }
});

test("3b each step has evidence provenance metadata", () => {
  const journey = resolveHiringJourney("candidate");
  assert.equal(journey.steps.length, HIRING_JOURNEY_STEP_IDS.length);
  for (const step of journey.steps) {
    assert.ok(
      en.hiringJourney[step.provenance.evidenceLabelKey.split(".")[1] as keyof typeof en.hiringJourney],
      `EN provenance label for ${step.id}`,
    );
    assert.ok(
      dictionaries.pl.hiringJourney[step.provenance.evidenceLabelKey.split(".")[1] as keyof typeof en.hiringJourney],
      `PL provenance label for ${step.id}`,
    );
  }
});

test("3c human review required on expected steps only", () => {
  const expected = [
    "trust_review",
    "candidate_readiness",
    "offer_readiness",
    "scheduling_proposal",
    "interview_preparation",
    "decision_review",
    "offer_decision",
    "placement_verification",
  ] as const;
  assert.deepEqual([...hiringJourneyHumanReviewStepIds()].sort(), [...expected].sort());
  const journey = resolveHiringJourney("recruiter");
  for (const step of journey.steps) {
    if (expected.includes(step.id as (typeof expected)[number])) {
      assert.equal(step.provenance.humanReviewRequired, true, step.id);
    } else {
      assert.equal(step.provenance.humanReviewRequired, false, step.id);
    }
  }
});

test("4 blocked actions include required boundaries", () => {
  const blob = JSON.stringify(en.hiringJourney);
  for (const pattern of REQUIRED_BLOCKED) {
    assert.match(blob, pattern, `required in EN: ${pattern}`);
  }
  const journey = resolveHiringJourney("candidate");
  const ids = journey.blockedActions.map((a) => a.id);
  assert.ok(ids.includes("no_advancement"));
  assert.ok(ids.includes("no_interview_scheduled"));
  assert.ok(ids.includes("no_invite_sent"));
  assert.ok(ids.includes("no_email_sent"));
  assert.ok(ids.includes("no_calendar_sync"));
  assert.ok(ids.includes("no_ats_writeback"));
  assert.ok(ids.includes("no_payment"));
  assert.ok(ids.includes("no_employer_confirmation"));
});

test("5 timeline component shows read-only badge and markers", () => {
  const panel = read("src/components/hiring-journey/HiringJourneyTimeline.tsx");
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.readOnlyBadge/);
  assert.match(panel, /hiringJourney\.readOnlyBadge/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.readOnlyNote/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.noLiveAction/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.boardBlocked/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.timeline/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.blockedActions/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.auditSummary/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.personaLabel/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.aliasNav/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.overviewLink/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.boardStepNavBlocked/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.stepProvenance/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.stepProvenanceHumanReview/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.stepProvenanceNoLiveAction/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.stepProvenanceMonitorOnly/);
  assert.match(panel, /hiringJourney\.provenanceTitle/);
  assert.match(panel, /hiringJourney\.provenanceNoLiveActionTaken/);
});

test("5b read-only label uses canonical preview copy", () => {
  assert.equal(en.hiringJourney.readOnlyBadge, "Read-only preview");
  assert.match(en.hiringJourney.readOnlyNote, /no live action has been taken/i);
  assert.equal(en.hiringJourney.humanReviewRequired, "Human review required");
  assert.equal(en.hiringJourney.noLiveActionTaken, "No live action has been taken");
});

test("5c board persona shows blocked overall status and board blocking point", () => {
  const journey = resolveHiringJourney("board");
  assert.equal(journey.overallStatus, "blocked");
  assert.equal(journey.blockingPointKey, "hiringJourney.blockingPointBoard");
  assert.equal(en.hiringJourney.overallBlocked, "Blocked");
});

test("5d timeline has no live-action CTA controls", () => {
  const panel = read("src/components/hiring-journey/HiringJourneyTimeline.tsx");
  assert.doesNotMatch(panel, /type="submit"/);
  assert.doesNotMatch(panel, /twin-btn-primary/);
  assert.doesNotMatch(panel, /<button/);
  assert.match(panel, /data-hiring-journey-nav="source-module"/);
  assert.match(panel, /data-hiring-journey-nav="source-module-blocked"/);
  assert.match(panel, /hiringJourneyBoardStepNavBlocked/);
});

test("5e step and cross-link hrefs are valid internal paths", () => {
  for (const persona of HIRING_JOURNEY_PERSONAS) {
    const journey = resolveHiringJourney(persona);
    for (const step of journey.steps) {
      assert.match(step.href, /^\/[a-z0-9/-]+$/);
    }
    for (const link of hiringJourneyCrossLinks(persona)) {
      assert.match(link.href, /^\/[a-z0-9/-]+$/);
    }
  }
});

test("6 cross-links point to existing safe routes", () => {
  const links = hiringJourneyCrossLinks("candidate");
  const hrefs = links.map((l) => l.href);
  assert.ok(hrefs.includes("/dashboard/offer-readiness"));
  assert.ok(hrefs.includes("/dashboard/scheduling-proposal"));
  assert.ok(hrefs.includes("/dashboard/placement-verification"));
  assert.ok(hrefs.includes("/board/hiring-journey"));
});

test("7 no forbidden claims in EN i18n namespace", () => {
  const blob = JSON.stringify(en.hiringJourney);
  for (const pattern of FORBIDDEN_COPY) {
    assert.equal(
      hiringJourneyHasAffirmativeForbiddenCopy(blob, pattern),
      false,
      `forbidden in EN: ${pattern}`,
    );
  }
});

test("8 i18n keys exist for EN and PL", () => {
  const enKeys = Object.keys(en.hiringJourney);
  const plKeys = Object.keys(dictionaries.pl.hiringJourney);
  assert.deepEqual(plKeys.sort(), enKeys.sort());
  assert.ok(en.hiringJourney.pageTitle);
  assert.ok(dictionaries.pl.hiringJourney.pageTitle);
});

test("9 all supported locale dictionaries preserve key parity", () => {
  const enKeys = Object.keys(en.hiringJourney).sort();
  for (const locale of LOCALES) {
    const keys = Object.keys(dictionaries[locale].hiringJourney).sort();
    assert.deepEqual(keys, enKeys, `${locale} hiringJourney key drift`);
  }
});

test("10 no token or secret-like strings in hiring journey sources", () => {
  const combined =
    read("src/lib/hiring-journey.ts") +
    read("src/lib/hiring-journey-demo-data.ts") +
    read("src/components/hiring-journey/HiringJourneyTimeline.tsx");
  for (const pattern of SECRET_PATTERNS) {
    assert.doesNotMatch(combined, pattern, `secret pattern: ${pattern}`);
  }
});

test("11 doc file exists and npm script registered", () => {
  assert.ok(existsSync(join(root, "..", HIRING_JOURNEY_DOC)));
  assert.match(read("package.json"), /test:hiring-journey/);
});

test("12 persona labels exist for all five route surfaces", () => {
  const surfaces = [
    "candidate_dashboard",
    "candidate_profile",
    "recruiter",
    "company",
    "board",
  ] as const;
  for (const surface of surfaces) {
    const key = hiringJourneyPersonaLabelKey(surface);
    assert.ok(en.hiringJourney[key.split(".")[1] as keyof typeof en.hiringJourney]);
    assert.ok(dictionaries.pl.hiringJourney[key.split(".")[1] as keyof typeof en.hiringJourney]);
    assert.equal(hiringJourneySurfacePersona(surface), surface.startsWith("candidate") ? "candidate" : surface);
  }
});

test("13 candidate alias nav links dashboard and profile routes", () => {
  const dashboardAlias = hiringJourneyCandidateAliasNav("candidate_dashboard");
  const profileAlias = hiringJourneyCandidateAliasNav("candidate_profile");
  assert.ok(dashboardAlias);
  assert.ok(profileAlias);
  assert.equal(dashboardAlias?.href, "/profile/hiring-journey");
  assert.equal(profileAlias?.href, "/dashboard/hiring-journey");
  assert.equal(hiringJourneyCandidateAliasNav("recruiter"), null);
  assert.equal(hiringJourneyCandidateAliasNav("board"), null);
});

test("14 overview links are persona-specific safe routes", () => {
  assert.equal(hiringJourneyOverviewLink("candidate_dashboard").href, "/dashboard");
  assert.equal(hiringJourneyOverviewLink("candidate_profile").href, "/profile");
  assert.equal(hiringJourneyOverviewLink("recruiter").href, "/recruiter/daily-cockpit");
  assert.equal(hiringJourneyOverviewLink("company").href, "/company/hiring-cockpit");
  assert.equal(hiringJourneyOverviewLink("board").href, "/board");
});

test("15 candidate dashboard and profile aliases resolve identical journey data", () => {
  const dashboardJourney = resolveHiringJourney(hiringJourneySurfacePersona("candidate_dashboard"));
  const profileJourney = resolveHiringJourney(hiringJourneySurfacePersona("candidate_profile"));
  assert.deepEqual(
    dashboardJourney.steps.map((step) => step.id),
    profileJourney.steps.map((step) => step.id),
  );
  assert.equal(dashboardJourney.overallStatus, profileJourney.overallStatus);
});

test("5f board provenance shows monitor-only on every step", () => {
  const panel = read("src/components/hiring-journey/HiringJourneyTimeline.tsx");
  assert.match(panel, /persona === "board"/);
  assert.match(panel, /provenanceMonitorOnly/);
  assert.match(en.hiringJourney.provenanceMonitorOnly, /monitor-only/i);
  assert.doesNotMatch(en.hiringJourney.provenancePlacementEvidenceLabel, /revenue/i);
  assert.doesNotMatch(en.hiringJourney.provenancePlacementEvidenceLabel, /employer confirmed/i);
});

test("16 board cross-links omit self-route and step nav stays blocked", () => {
  const boardLinks = hiringJourneyCrossLinks("board");
  const hrefs = boardLinks.map((link) => link.href);
  assert.ok(!hrefs.includes("/board/hiring-journey"));
  assert.equal(hiringJourneyBoardStepNavBlocked("board"), true);
  assert.equal(hiringJourneyBoardStepNavBlocked("candidate"), false);
  const companyLinks = hiringJourneyCrossLinks("company");
  assert.ok(companyLinks.some((link) => link.href === "/company/candidates/demo-candidate-001"));
});

test("17 negative live-action guard — prohibited copy, controls, allowed nav", () => {
  const sourceBlob = HIRING_JOURNEY_UI_SOURCE_FILES.map((rel) => read(rel)).join("\n");
  const componentSrc = stripSourceComments(read("src/components/hiring-journey/HiringJourneyTimeline.tsx"));

  for (const pattern of FORBIDDEN_COPY) {
    assert.equal(
      hiringJourneyHasAffirmativeForbiddenCopy(sourceBlob, pattern),
      false,
      `affirmative forbidden copy in hiring journey sources: ${pattern}`,
    );
  }

  for (const locale of LOCALES) {
    const blob = JSON.stringify(dictionaries[locale].hiringJourney);
    for (const pattern of FORBIDDEN_COPY) {
      assert.equal(
        hiringJourneyHasAffirmativeForbiddenCopy(blob, pattern),
        false,
        `affirmative forbidden copy in ${locale}.hiringJourney: ${pattern}`,
      );
    }
  }

  const enBlob = JSON.stringify(en.hiringJourney);
  for (const marker of HIRING_JOURNEY_ALLOWED_SAFE_COPY_MARKERS) {
    assert.match(enBlob, marker, `required safe marker in EN: ${marker}`);
  }

  for (const pattern of HIRING_JOURNEY_FORBIDDEN_MUTATION_CONTROLS) {
    assert.doesNotMatch(componentSrc, pattern, `mutation control in timeline component: ${pattern}`);
  }

  for (const navAttr of HIRING_JOURNEY_ALLOWED_NAV_ATTRIBUTES) {
    assert.match(componentSrc, new RegExp(navAttr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
