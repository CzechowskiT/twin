import assert from "node:assert/strict";
import test from "node:test";

import { en, dictionaries, LOCALES, type Locale } from "../src/lib/i18n";

function collectStringPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return typeof obj === "string" && prefix ? [prefix] : [];
  }
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(...collectStringPaths(value, path));
  }
  return paths;
}

function getString(obj: unknown, path: string): string | undefined {
  let current: unknown = obj;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

const enPaths = collectStringPaths(en);

/** Obvious English calques that should not appear in polished PL product copy. */
const PL_CALQUE_PATTERNS: RegExp[] = [
  /\bprzegląd człowieka\b/i,
  /\brecenzja człowieka\b/i,
  /\bDowód operacyjny\b/i,
  /\bpowierzchnie operacyjne\b/i,
  /\bSelf-declaration\b/i,
  /\balignmentowych\b/i,
  /\bwritebacku\b/i,
  /\boutreachu\b/i,
  /\blive sync\b/i,
  /\bhold writes\b/i,
  /\bHold write\b/i,
];

const FORBIDDEN_CLAIM_PATTERNS: RegExp[] = [
  /\blaunch ready\b/i,
  /\bgdpr compliant\b/i,
  /\bidentity verified\b/i,
  /\bkyc passed\b/i,
  /\bautomatic scheduling\b/i,
  /\bats writeback completed\b/i,
  /\bpayout completed\b/i,
  /\bplacement externally verified\b/i,
  /\bp0 solved\b/i,
  /\bphase 3b unlocked\b/i,
  /\bcandidate notified\b/i,
];

/** Positive-only claims — skip when immediately preceded by not/no/bez/nie/brak/without. */
const FORBIDDEN_POSITIVE_CLAIM_PATTERNS: RegExp[] = [
  /\bgdpr compliant\b/i,
  /\bidentity verified\b/i,
  /\bkyc passed\b/i,
  /\blaunch ready\b/i,
  /\bpayment completed\b/i,
  /\bpayout completed\b/i,
  /\bplacement externally verified\b/i,
  /\bemployer confirmed\b/i,
  /\bcandidate notified\b/i,
  /\bphase 3b unlocked\b/i,
  /\bp0 solved\b/i,
];

function hasPositiveForbiddenClaim(blob: string, pattern: RegExp): boolean {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const match of blob.matchAll(re)) {
    const idx = match.index ?? 0;
    const before = blob.slice(Math.max(0, idx - 24), idx);
    if (/\b(not|no|bez|nie|brak|without)\s*$/i.test(before)) continue;
    return true;
  }
  return false;
}

const SECRET_LIKE_PATTERNS: RegExp[] = [
  /sk_live_[a-zA-Z0-9]+/,
  /sk_test_[a-zA-Z0-9]+/,
  /Bearer eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
  /ANTHROPIC_API_KEY=[a-zA-Z0-9]+/,
];

const CRITICAL_DOMAINS = [
  "placementVerificationEvidence",
  "microsoftCalendarReadiness",
  "microsoftBusyRead",
  "calendarReadinessEvidence",
  "candidateOfferReadiness",
  "offerReadinessEvidence",
  "schedulingDecisionContext",
  "offerReadinessPreview",
  "boardOfferReadiness",
  "boardPlacementEvidence",
  "dashboard",
  "recruiterInbox",
  "home",
  "companyTalentPool",
  "recruiterTrustReviewQueue",
  "recruiterOperationalWorkQueue",
  "recruiterDailyCockpit",
] as const;

const PERSONA_RECRUITER_PL_LOANWORDS: RegExp[] = [
  /\blive sync\b/i,
  /\boutreachu\b/i,
  /\bwritebacku\b/i,
  /\boutbound nie live\b/i,
  /\bauto-outreachu\b/i,
  /\bauto outreachu\b/i,
];

function domainBlob(locale: Locale, domain: (typeof CRITICAL_DOMAINS)[number]): string {
  const dict = dictionaries[locale] as Record<string, unknown>;
  return JSON.stringify(dict[domain] ?? {});
}

test("PL dictionary avoids obvious English calques in critical product domains", () => {
  const pl = dictionaries.pl;
  const blob = CRITICAL_DOMAINS.map((d) => domainBlob("pl", d)).join("\n");
  for (const pattern of PL_CALQUE_PATTERNS) {
    assert.doesNotMatch(blob, pattern, `PL calque ${pattern} in critical domains`);
  }
  assert.ok(pl.candidateOfferReadiness.pageTitle.length > 0);
});

test("all locales avoid forbidden product claims", () => {
  for (const locale of LOCALES) {
    const blob = JSON.stringify(dictionaries[locale]);
    for (const pattern of FORBIDDEN_CLAIM_PATTERNS) {
      assert.doesNotMatch(blob, pattern, `${pattern} in dictionaries.${locale}`);
    }
    for (const pattern of FORBIDDEN_POSITIVE_CLAIM_PATTERNS) {
      assert.equal(
        hasPositiveForbiddenClaim(blob, pattern),
        false,
        `${pattern} (positive) in dictionaries.${locale}`,
      );
    }
  }
});

test("placeholder tokens match English across all locales", () => {
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    const dict = dictionaries[locale];
    const mismatches: string[] = [];
    for (const path of enPaths) {
      const enValue = getString(en, path);
      const localeValue = getString(dict, path);
      if (!enValue || !localeValue) continue;
      const enPh = [...enValue.matchAll(/\{[^}]+\}/g)].map((m) => m[0]).sort().join(",");
      const locPh = [...localeValue.matchAll(/\{[^}]+\}/g)].map((m) => m[0]).sort().join(",");
      if (enPh !== locPh) mismatches.push(path);
    }
    assert.equal(
      mismatches.length,
      0,
      `${locale} placeholder mismatch: ${mismatches.slice(0, 6).join(", ")}`,
    );
  }
});

test("PL and EN preserve critical automation pause and human-decision safety copy", () => {
  const enDash = en.dashboard.applicationTransparencyAutomation.toLowerCase();
  const plDash = dictionaries.pl.dashboard.applicationTransparencyAutomation.toLowerCase();
  assert.match(enDash, /auto-apply.*paused/);
  assert.match(plDash, /auto-apply.*wstrzymane/);
  assert.match(enDash, /delegated apply.*not live/);
  assert.match(plDash, /delegated apply nie jest live/);

  const enImportant = en.dashboard.applicationTransparencyImportant.toLowerCase();
  const plImportant = dictionaries.pl.dashboard.applicationTransparencyImportant.toLowerCase();
  assert.match(enImportant, /does not make hiring/);
  assert.match(plImportant, /nie podejmuje decyzji rekrutacyjnej/);

  const plOffer = domainBlob("pl", "candidateOfferReadiness").toLowerCase();
  assert.match(plOffer, /ręczn/);
  assert.match(plOffer, /podgląd|odczyt/);
  for (const pattern of [/\bgwarantowan[aą] ofert/i, /\bgwarantowane wynagrodzenie\b/i]) {
    assert.equal(hasPositiveForbiddenClaim(plOffer, pattern), false, `PL offer positive claim ${pattern}`);
  }
});

test("offer and placement readiness copy states preview-only boundaries in PL and EN", () => {
  for (const locale of ["en", "pl"] as const) {
    const offer = domainBlob(locale, "candidateOfferReadiness").toLowerCase();
    assert.match(offer, /preview|podgląd/);
    for (const pattern of [/\bguaranteed offer\b/i, /\bgwarantowan[aą] ofert/i]) {
      assert.equal(
        hasPositiveForbiddenClaim(offer, pattern),
        false,
        `${locale} offer positive claim ${pattern}`,
      );
    }

    const placement = domainBlob(locale, "placementVerificationEvidence").toLowerCase();
    assert.match(placement, /read-only|odczyt|podgląd/);
    assert.match(placement, /not legal|nie.*prawn|bez mocy prawnej|preview only|tylko podgląd|wstępn/);
  }
});

test("i18n dictionaries contain no secret-like token strings", () => {
  for (const locale of LOCALES) {
    const blob = JSON.stringify(dictionaries[locale]);
    for (const pattern of SECRET_LIKE_PATTERNS) {
      assert.doesNotMatch(blob, pattern, `${pattern} in dictionaries.${locale}`);
    }
  }
});

test("native PL phrasing uses natural offer-readiness and calendar labels", () => {
  const pl = dictionaries.pl;
  assert.match(pl.candidateOfferReadiness.pageTitle, /przygotowan|gotowość/i);
  assert.match(pl.microsoftBusyRead.slotPreviewTitle, /zajętości|odczyt|podgląd/i);
  assert.doesNotMatch(pl.placementVerificationEvidence.panelTitle, /Dowód operacyjny/i);
});

test("PL persona and recruiter hub domains avoid English loanwords for sync and outreach", () => {
  const domains = [
    "companyTalentPool",
    "recruiterTrustReviewQueue",
    "recruiterOperationalWorkQueue",
    "recruiterDailyCockpit",
  ] as const;
  const blob = domains.map((d) => domainBlob("pl", d)).join("\n");
  for (const pattern of PERSONA_RECRUITER_PL_LOANWORDS) {
    assert.doesNotMatch(blob, pattern, `PL loanword ${pattern} in persona/recruiter domains`);
  }
  assert.match(dictionaries.pl.companyTalentPool.title, /pamięć talentów/i);
  assert.match(dictionaries.pl.recruiterTrustReviewQueue.pageTitle, /przeglądu zaufania/i);
  assert.match(dictionaries.pl.recruiterDailyCockpit.navLink, /kokpit dzienny/i);
});

test("es and ja persona hub recruiter overlays are not English page titles", () => {
  for (const locale of ["es", "ja"] as const) {
    const pool = dictionaries[locale].companyTalentPool;
    assert.doesNotMatch(pool.title, /^Company talent memory$/);
    const queue = dictionaries[locale].recruiterTrustReviewQueue;
    assert.doesNotMatch(queue.pageTitle, /^Recruiter trust review queue$/);
    const cockpit = dictionaries[locale].recruiterDailyCockpit;
    assert.doesNotMatch(cockpit.pageEyebrow, /^Recruiter daily operating cockpit$/);
  }
});
