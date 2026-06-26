/**
 * Hiring journey timeline — route wiring, copy guards, cross-links.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  HIRING_JOURNEY_DOC,
  HIRING_JOURNEY_MARKERS,
  HIRING_JOURNEY_PERSONAS,
  HIRING_JOURNEY_ROUTES,
  HIRING_JOURNEY_STEP_IDS,
  hiringJourneyCrossLinks,
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

const FORBIDDEN_COPY = [
  /meeting created/i,
  /(?<!no )invite sent/i,
  /(?<!no )email sent/i,
  /calendar synced/i,
  /automatic scheduling/i,
  /employer confirmed/i,
  /candidate hired/i,
  /offer accepted/i,
  /placement confirmed externally/i,
  /revenue recognized/i,
  /launch ready/i,
] as const;

const SECRET_PATTERNS = [/sk_live_/i, /Bearer eyJ/i, /password\s*=\s*["'][^"']+["']/i] as const;

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

test("2 all five routes are registered", () => {
  for (const route of ROUTE_FILES) {
    assert.ok(existsSync(join(root, route)), route);
    const src = read(route);
    assert.match(src, /HiringJourneyTimeline/);
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
    assert.ok(step.nextSafeActionKey);
    assert.ok(step.safetyBoundaryKey);
    assert.ok(step.href.startsWith("/"));
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
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.timeline/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.blockedActions/);
  assert.match(panel, /HIRING_JOURNEY_MARKERS\.auditSummary/);
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
    assert.doesNotMatch(blob, pattern, `forbidden in EN: ${pattern}`);
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
