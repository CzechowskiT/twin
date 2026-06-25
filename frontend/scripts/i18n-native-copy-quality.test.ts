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
  "recruiterTalentRadar",
  "recruiterTalentRadarDigest",
  "atsImportReadiness",
  "founderLedDemo",
  "executiveProductProof",
  "candidateProfile360",
  "jobPipeline",
  "candidateCollaboration",
  "candidateTrust",
  "candidateTrustCenter",
  "candidateControlCenter",
  "candidateExportPreview",
  "candidateIdentityVerification",
  "candidateDataPortability",
  "candidateRevokeDelete",
  "candidateTrustAuditExport",
  "candidateConsentReceipt",
  "candidateTrustOverview",
] as const;

const PERSONA_RECRUITER_PL_LOANWORDS: RegExp[] = [
  /\blive sync\b/i,
  /\boutreachu\b/i,
  /\bwritebacku\b/i,
  /\boutbound nie live\b/i,
  /\bauto-outreachu\b/i,
  /\bauto outreachu\b/i,
];

const TALENT_RADAR_ATS_DEMO_PL_LOANWORDS: RegExp[] = [
  /\boutreachu\b/i,
  /\bwritebacku\b/i,
  /\blive sync\b/i,
  /\bprzegląd człowieka\b/i,
  /\bauto-outreach\b/i,
  /\bLIVE SYNC\b/i,
  /\bWRITEBACK\b/i,
];

const PROFILE_PIPELINE_TRUST_PL_LOANWORDS: RegExp[] = [
  /\boutreachu\b/i,
  /\bwritebacku\b/i,
  /\blive sync\b/i,
  /\bProfile 360\b/i,
  /\bTalent Radar\b/i,
  /\bTalent Pool\b/i,
  /\bscorecardy\b/i,
  /\bverified readiness\b/i,
  /\bsystem-of-record\b/i,
  /\bauto-outreachu\b/i,
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

test("PL talent radar, ATS import, and demo domains avoid English loanwords", () => {
  const domains = [
    "recruiterTalentRadar",
    "recruiterTalentRadarDigest",
    "atsImportReadiness",
    "founderLedDemo",
    "executiveProductProof",
  ] as const;
  const blob = domains.map((d) => domainBlob("pl", d)).join("\n");
  for (const pattern of TALENT_RADAR_ATS_DEMO_PL_LOANWORDS) {
    assert.doesNotMatch(blob, pattern, `PL loanword ${pattern} in talent radar/ATS/demo domains`);
  }
  assert.match(dictionaries.pl.recruiterTalentRadar.title, /radar talentów/i);
  assert.match(dictionaries.pl.atsImportReadiness.title, /gotowość importu ats/i);
  assert.match(dictionaries.pl.founderLedDemo.journeyTalentRadarTitle, /radar talentów/i);
});

test("it fr de zh ar talent radar ATS demo overlays are not English page titles", () => {
  for (const locale of ["it", "fr", "de", "zh", "ar"] as const) {
    const radar = dictionaries[locale].recruiterTalentRadar;
    assert.doesNotMatch(radar.title, /^Talent Radar$/);
    const ats = dictionaries[locale].atsImportReadiness;
    assert.doesNotMatch(ats.title, /^ATS Import Readiness$/);
    const demo = dictionaries[locale].founderLedDemo;
    assert.doesNotMatch(demo.journeyTalentRadarTitle, /^Talent Radar$/);
  }
});

test("PL profile, pipeline, and trust domains avoid English loanwords", () => {
  const domains = [
    "candidateProfile360",
    "jobPipeline",
    "candidateCollaboration",
    "candidateTrust",
    "candidateTrustCenter",
    "candidateControlCenter",
    "candidateExportPreview",
    "candidateIdentityVerification",
    "candidateDataPortability",
    "candidateRevokeDelete",
    "candidateTrustAuditExport",
    "candidateConsentReceipt",
    "candidateTrustOverview",
  ] as const;
  const blob = domains.map((d) => domainBlob("pl", d)).join("\n");
  for (const pattern of PROFILE_PIPELINE_TRUST_PL_LOANWORDS) {
    assert.doesNotMatch(blob, pattern, `PL loanword ${pattern} in profile/pipeline/trust domains`);
  }
  assert.match(dictionaries.pl.candidateProfile360.pageEyebrow, /profil kandydata 360/i);
  assert.match(dictionaries.pl.jobPipeline.pageEyebrow, /lejek rekrutacyjny/i);
  assert.match(dictionaries.pl.candidateTrustCenter.pageTitle, /centrum zaufania/i);
});

test("es it fr de zh ar profile pipeline trust overlays are not English page titles", () => {
  for (const locale of ["es", "it", "fr", "de", "zh", "ar"] as const) {
    const profile = dictionaries[locale].candidateProfile360;
    assert.doesNotMatch(profile.pageEyebrow, /^Candidate Profile 360$/);
    const pipeline = dictionaries[locale].jobPipeline;
    assert.doesNotMatch(pipeline.pageEyebrow, /^Job pipeline$/);
    const trust = dictionaries[locale].candidateTrustCenter;
    assert.doesNotMatch(trust.pageTitle, /^Candidate trust center$/);
    const exportPreview = dictionaries[locale].candidateExportPreview;
    assert.doesNotMatch(exportPreview.pageTitle, /^Candidate export preview$/);
    const identity = dictionaries[locale].candidateIdentityVerification;
    assert.doesNotMatch(identity.pageTitle, /^Candidate identity verification$/);
  }
});

const OFFER_PLACEMENT_CALENDAR_DOMAINS = [
  "candidateOfferReadiness",
  "offerReadinessEvidence",
  "placementVerificationEvidence",
  "microsoftCalendarReadiness",
  "microsoftBusyRead",
  "calendarReadinessEvidence",
] as const;

const PREMIUM_READ_ONLY_BOUNDARY_PATHS = [
  "candidateExportPreview.boundaryBody",
  "recruiterTrustReviewQueue.boundaryBody",
  "candidateOfferReadiness.boundaryNote",
  "placementVerificationEvidence.boundaryNote",
  "microsoftBusyRead.noInviteSent",
  "microsoftBusyRead.noCalendarSync",
] as const;

const PREMIUM_HUMAN_DECISION_BOUNDARY_PATHS = [
  "candidateProfile360.boundaryBody",
  "jobPipeline.boundaryBody",
  "candidateTrustCenter.boundaryBody",
  "atsImportReadiness.boundaryBody",
] as const;

/** Overlay keys we translate — scan only these for English leakage. */
const PREMIUM_TRANSLATED_PATHS = [
  "candidateOfferReadiness.pageTitle",
  "candidateOfferReadiness.summaryLead",
  "candidateOfferReadiness.boundaryNote",
  "offerReadinessEvidence.panelTitle",
  "offerReadinessEvidence.boundaryNote",
  "placementVerificationEvidence.panelTitle",
  "placementVerificationEvidence.boundaryNote",
  "microsoftBusyRead.slotPreviewTitle",
  "microsoftBusyRead.noInviteSent",
  "microsoftBusyRead.noCalendarSync",
  "calendarReadinessEvidence.panelTitle",
  "calendarReadinessEvidence.boundaryNote",
  "companyTalentPool.title",
  "recruiterTrustReviewQueue.pageTitle",
  "recruiterTrustReviewQueue.boundaryBody",
  "recruiterDailyCockpit.pageEyebrow",
  "recruiterTalentRadar.title",
  "atsImportReadiness.title",
  "atsImportReadiness.boundaryBody",
  "candidateProfile360.pageEyebrow",
  "candidateProfile360.boundaryBody",
  "jobPipeline.pageEyebrow",
  "jobPipeline.boundaryBody",
  "candidateTrustCenter.pageTitle",
  "candidateTrustCenter.boundaryBody",
  "candidateExportPreview.boundaryBody",
  "candidateIdentityVerification.boundaryBody",
] as const;

/** English fragments that should not appear in non-EN premium overlay blobs. */
const UNTRANSLATED_ENGLISH_FRAGMENTS: RegExp[] = [
  /\bautomatic outreach is live\b/i,
  /\bcold email\b/i,
  /\bcold-mail\b/i,
  /\bATS writeback\b/i,
  /\blive sync\b/i,
  /\bwriteback\b/i,
  /\boutbound\b/i,
  /\bshortlist\b/i,
  /\bSnooze\b/,
  /\bHuman review required\b/,
];

const ALLOWED_ENGLISH_TERMS =
  /\b(TWIN|ATS|OAuth|Graph|API|Calendars\.Read|busy-read|Candidate Profile 360|Talent Radar|KYC|PII|JSON|NDA|GitHub|Stripe|Markdown|OpenAPI|GET|H5b|H5c|H5d|NO-GO|NOT LIVE|PAUSED|LIVE|Demo|demo|pilot|Pilot|placement|Placement|offer|Offer|recruiter|Recruiter|pipeline|Pipeline|cap table|founder|Founder|Microsoft|Google|ICS|WebCal|B2B|MRR|SKU|GA|CEO|CTO|FAQ|email|Email|status|Status|Persona|persona|beta|Beta|checklist|Checklist|append-only|read-only|Read-only)\b/;

function stripAllowedEnglishTerms(value: string): string {
  return value.replace(ALLOWED_ENGLISH_TERMS, "");
}

function premiumOverlayBlob(locale: Locale): string {
  const domains = [
    ...OFFER_PLACEMENT_CALENDAR_DOMAINS,
    "companyTalentPool",
    "recruiterTrustReviewQueue",
    "recruiterDailyCockpit",
    "recruiterTalentRadar",
    "atsImportReadiness",
    "candidateProfile360",
    "jobPipeline",
    "candidateTrustCenter",
  ] as const;
  return domains.map((d) => domainBlob(locale, d)).join("\n");
}

test("offer placement and calendar overlays are not English page titles for es it fr de zh ar", () => {
  for (const locale of ["es", "it", "fr", "de", "zh", "ar"] as const) {
    const offer = dictionaries[locale].candidateOfferReadiness;
    assert.doesNotMatch(offer.pageTitle, /^Offer readiness center$/);
    const placement = dictionaries[locale].placementVerificationEvidence;
    assert.doesNotMatch(placement.panelTitle, /^Placement verification evidence$/);
    const busy = dictionaries[locale].microsoftBusyRead;
    assert.doesNotMatch(busy.slotPreviewTitle, /^Read-only busy availability$/);
    const calendar = dictionaries[locale].calendarReadinessEvidence;
    assert.doesNotMatch(calendar.panelTitle, /^Calendar readiness evidence$/);
  }
});

test("it fr de zh ar persona hub recruiter overlays are not English page titles", () => {
  for (const locale of ["it", "fr", "de", "zh", "ar"] as const) {
    const pool = dictionaries[locale].companyTalentPool;
    assert.doesNotMatch(pool.title, /^Company talent memory$/);
    const queue = dictionaries[locale].recruiterTrustReviewQueue;
    assert.doesNotMatch(queue.pageTitle, /^Recruiter trust review queue$/);
    const cockpit = dictionaries[locale].recruiterDailyCockpit;
    assert.doesNotMatch(cockpit.pageEyebrow, /^Recruiter daily operating cockpit$/);
  }
});

function premiumTranslatedBlob(locale: Locale): string {
  return PREMIUM_TRANSLATED_PATHS.map((path) => getString(dictionaries[locale], path) ?? "").join("\n");
}

test("premium overlay boundary copy exists for all supported locales", () => {
  for (const locale of LOCALES) {
    for (const path of PREMIUM_READ_ONLY_BOUNDARY_PATHS) {
      const value = getString(dictionaries[locale], path);
      assert.ok(value && value.trim().length > 8, `${locale} missing boundary copy at ${path}`);
      const lower = value.toLowerCase();
      if (path.includes("noInvite") || path.includes("noCalendar")) {
        assert.match(
          lower,
          /invite|invit|zapros|einladung|邀请|دعو|同期|sync|sincron|synchron|مزامن|kalender|calendrier|calendario|日历|تقويم/,
          `${locale} boundary should mention no-invite or no-sync at ${path}`,
        );
      } else {
        assert.match(
          lower,
          /read-only|solo lectura|solo lettura|lecture seule|nur-les|只读|预览|للقراءة|odczyt|podgląd|anteprima|aperçu|vorschau|معاينة|preview|previa|lettura|lecture|lesen|读|demo|読み|専用|デモ/,
          `${locale} boundary should state read-only/preview at ${path}`,
        );
      }
    }
    for (const path of PREMIUM_HUMAN_DECISION_BOUNDARY_PATHS) {
      const value = getString(dictionaries[locale], path);
      assert.ok(value && value.trim().length > 8, `${locale} missing boundary copy at ${path}`);
      const lower = value.toLowerCase();
      assert.match(
        lower,
        /recruiter|reclutador|rekruter|human|człowiek|ręczn|招聘|recruteur|mensch|bénéficiaire|kandydat|candidat|مرشح|موظف|候选|auto-apply|auto-candidat|automat|تلقائي|bez automat|nessuna auto|pas d'auto|kein auto|无自动|لا تقديم|manual|manuale|manuelle|人工|بشر/,
        `${locale} boundary should state human/auto-apply limits at ${path}`,
      );
    }
  }
});

test("non-English premium overlays avoid obvious untranslated English fragments", () => {
  // ja: partial overlay slice only — full native review deferred.
  for (const locale of ["es", "it", "fr", "de", "zh", "ar"] as const) {
    const scrubbed = stripAllowedEnglishTerms(premiumTranslatedBlob(locale));
    for (const pattern of UNTRANSLATED_ENGLISH_FRAGMENTS) {
      assert.doesNotMatch(
        scrubbed,
        pattern,
        `${pattern} in premium overlays (${locale})`,
      );
    }
  }
});

test("long-form premium overlay domains preserve placeholder sets vs English", () => {
  const premiumPaths = collectStringPaths({
    candidateOfferReadiness: en.candidateOfferReadiness,
    offerReadinessEvidence: en.offerReadinessEvidence,
    placementVerificationEvidence: en.placementVerificationEvidence,
    microsoftBusyRead: en.microsoftBusyRead,
    calendarReadinessEvidence: en.calendarReadinessEvidence,
    companyTalentPool: en.companyTalentPool,
    recruiterTrustReviewQueue: en.recruiterTrustReviewQueue,
    candidateProfile360: en.candidateProfile360,
    jobPipeline: en.jobPipeline,
    candidateTrustCenter: en.candidateTrustCenter,
  });
  for (const locale of ["es", "it", "fr", "de", "zh", "ar", "ja"] as const) {
    const mismatches: string[] = [];
    for (const path of premiumPaths) {
      const enValue = getString(en, path);
      const localeValue = getString(dictionaries[locale], path);
      if (!enValue || !localeValue) continue;
      const enPh = [...enValue.matchAll(/\{[^}]+\}/g)].map((m) => m[0]).sort().join(",");
      const locPh = [...localeValue.matchAll(/\{[^}]+\}/g)].map((m) => m[0]).sort().join(",");
      if (enPh !== locPh) mismatches.push(path);
    }
    assert.equal(
      mismatches.length,
      0,
      `${locale} premium placeholder mismatch: ${mismatches.slice(0, 6).join(", ")}`,
    );
  }
});

test("long-form overlay domains avoid forbidden claims across all locales", () => {
  const domains = [
    ...OFFER_PLACEMENT_CALENDAR_DOMAINS,
    "companyTalentPool",
    "recruiterTalentRadar",
    "candidateProfile360",
    "candidateTrustCenter",
  ] as const;
  for (const locale of LOCALES) {
    const blob = domains.map((d) => domainBlob(locale, d)).join("\n");
    for (const pattern of FORBIDDEN_POSITIVE_CLAIM_PATTERNS) {
      assert.equal(
        hasPositiveForbiddenClaim(blob, pattern),
        false,
        `${pattern} (positive) in long-form overlays (${locale})`,
      );
    }
  }
});
