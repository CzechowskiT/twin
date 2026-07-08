import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { en, dictionaries, LOCALES } from "../src/lib/i18n";

const pl = dictionaries.pl;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bAI decides\b/i,
  /\bAI hires\b/i,
  /\bwe decide\b/i,
  /\bperfect match\b/i,
  /\bauto-apply is live\b/i,
  /\bdelegated apply is live\b/i,
  /\bapplies automatically\b/i,
  /\bguaranteed interview\b/i,
  /\bthousands of users\b/i,
  /\blaunch ready\b/i,
  /\bgdpr compliant\b/i,
  /\bidentity verified\b/i,
  /\bkyc passed\b/i,
  /\bpayment completed\b/i,
  /\bpayout completed\b/i,
  /\bplacement externally verified\b/i,
  /\bcandidate notified\b/i,
  /\bphase 3b unlocked\b/i,
  /\bp0 solved\b/i,
];

const TRUST_SURFACES = [
  "src/lib/i18n.ts",
  "src/lib/persona-pages.ts",
  "src/lib/faq-messages.ts",
  "src/components/marketing/landing-trust-cue.tsx",
] as const;

/** Positive-only marketing claims — skip when preceded by not/no/bez/nie/brak/without. */
const MARKETING_POSITIVE_CLAIM_PATTERNS: RegExp[] = [
  /\blaunch ready\b/i,
  /\bgdpr compliant\b/i,
  /\bats writeback completed\b/i,
  /\bautomatic outreach is live\b/i,
  /\bapplies automatically\b/i,
  /\bcalendar writes enabled\b/i,
  /\bwhile you sleep\b/i,
];

function hasPositiveForbiddenClaim(blob: string, pattern: RegExp): boolean {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const match of blob.matchAll(re)) {
    const idx = match.index ?? 0;
    const before = blob.slice(Math.max(0, idx - 28), idx);
    if (/\b(not|no|bez|nie|brak|without|blocked|disabled|off|paused|wstrzym)\s*$/i.test(before)) continue;
    return true;
  }
  return false;
}

function readSurface(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function dashboardTrustCopy(locale: typeof en): string {
  const d = locale.dashboard;
  return [
    d.northStarLead,
    d.applicationTransparencyImportant,
    d.applicationTransparencyAutomation,
    d.autoApplyHint,
    d.todayNbaReasonMatches,
  ].join("\n");
}

function recruiterTrustCopy(locale: typeof en): string {
  const r = locale.recruiterInbox;
  return [r.lead, r.humanDecisionNote, r.decisionConsoleSubcopy, r.reviewDisclaimer].join("\n");
}

function recruiterCockpitTrustCopy(locale: typeof en): string {
  const c = locale.recruiterDailyCockpit;
  const q = locale.recruiterTrustReviewQueue;
  const w = locale.recruiterOperationalWorkQueue;
  return [c.humanBoundaryBody, c.atsImportLead, q.boundaryBody, w.boundaryBody].join("\n");
}

function talentRadarAtsDemoTrustCopy(locale: typeof en): string {
  const r = locale.recruiterTalentRadar;
  const d = locale.recruiterTalentRadarDigest;
  const a = locale.atsImportReadiness;
  const f = locale.founderLedDemo;
  return [r.disclaimer, r.trustFooter, d.trustBody, a.boundaryBody, f.boundaryNoOutreach].join("\n");
}

function profilePipelineTrustCopy(locale: typeof en): string {
  const p = locale.candidateProfile360;
  const j = locale.jobPipeline;
  const t = locale.candidateTrust;
  const c = locale.candidateTrustCenter;
  const e = locale.candidateExportPreview;
  return [p.boundaryBody, j.boundaryBody, t.boundaryBody, c.boundaryBody, e.boundaryBody].join("\n");
}

function homeTrustCopy(locale: typeof en): string {
  const h = locale.home;
  return [
    h.insideTitle,
    h.insideStep3Line,
    h.feature6Title,
    h.feature6Line,
    h.focusFootnote,
    h.focusChipAuto,
    h.audienceCandidateBody,
    h.vacationScene4Body,
    h.vacationActivity4,
  ].join("\n");
}

function marketingHowItWorksTrustCopy(locale: typeof en): string {
  const m = locale.marketingHowItWorks;
  return [
    m.lead,
    m.contrastWith3,
    m.step3Line,
    m.step4Line,
    m.timeline2Body,
    m.timeline3Body,
  ].join("\n");
}

function demoTrustCopy(locale: typeof en): string {
  const d = locale.demo;
  return [d.pageLead, d.heroPipelineBody, d.step6Lead, d.statusPreparedBody, d.calendarHint].join("\n");
}

function investorRoomTrustCopy(locale: typeof en): string {
  const r = locale.investorRoom;
  const s = locale.systemOfRecord;
  return [
    r.launchStanceBody,
    r.lead,
    r.persona_candidate_body,
    r.persona_recruiter_body,
    r.statusItem_autoApply_body,
    r.statusItem_delegatedApply_body,
    r.statusItem_recruiterIntegrations_body,
    s.investorGroupProductLead,
    s.investorGroupDemoLead,
  ].join("\n");
}

function executiveProductProofTrustCopy(locale: typeof en): string {
  const e = locale.executiveProductProof;
  return [e.lead, e.launchDetail, e.demoJourneyDesc, e.sorHubHint, e.boundaryNoOutreach, e.boundaryNoAtsSync].join("\n");
}

function onboardingTrustCopy(locale: typeof en): string {
  return locale.onboardingFlow.welcomeBody;
}

test("trust surfaces contain no forbidden live-automation or AI-decides claims", () => {
  for (const relativePath of TRUST_SURFACES) {
    const src = readSurface(relativePath);
    for (const pattern of FORBIDDEN_PATTERNS) {
      assert.doesNotMatch(src, pattern, `${pattern} in ${relativePath}`);
    }
  }
});

test("autopilot mentions in i18n home include phased or paused context", () => {
  for (const locale of [en, pl]) {
    const copy = homeTrustCopy(locale).toLowerCase();
    if (!copy.includes("autopilot") && !copy.includes("auto-aplik")) continue;
    assert.match(
      copy,
      /phased|paused|prepare-only|not live|wstrzym|etapami|fazow/,
      "autopilot copy must include phased/paused context",
    );
  }
});

test("EN and PL marketing surfaces avoid positive-only launch and automation claims", () => {
  for (const locale of [en, pl]) {
    const blob = [
      homeTrustCopy(locale),
      marketingHowItWorksTrustCopy(locale),
      demoTrustCopy(locale),
      onboardingTrustCopy(locale),
    ].join("\n");
    for (const pattern of MARKETING_POSITIVE_CLAIM_PATTERNS) {
      assert.equal(
        hasPositiveForbiddenClaim(blob, pattern),
        false,
        `${pattern} (positive) in marketing trust copy (${locale})`,
      );
    }
    const lower = blob.toLowerCase();
    assert.match(lower, /auto-apply.*paused|auto-aplik.*wstrzym|auto-aplikacja.*wstrzym/);
    assert.match(lower, /prepare-only|prepare only|pakiety prepare|packages for your review|przygotowuje pakiety/);
  }
});

test("i18n dictionaries contain no forbidden live-automation or AI-decides claims", () => {
  for (const locale of LOCALES) {
    const blob = JSON.stringify(dictionaries[locale]);
    for (const pattern of FORBIDDEN_PATTERNS) {
      assert.doesNotMatch(blob, pattern, `${pattern} in dictionaries.${locale}`);
    }
  }
});

test("investor room and product proof copy state NO-GO and bounded diligence", () => {
  for (const locale of [en, pl]) {
    const room = investorRoomTrustCopy(locale).toLowerCase();
    assert.match(room, /no-go|no go|wstrzym|nie live|not live|paused/);
    assert.match(room, /auto-apply.*paused|auto-apply.*wstrzym|auto-aplik/);
    assert.doesNotMatch(room, /launch ready|general availability|ga launch/);
    for (const pattern of [/\bats writeback completed\b/i, /\bautomatic outreach is live\b/i]) {
      assert.doesNotMatch(room, pattern, `${pattern} in investor room trust copy (${locale})`);
    }

    const proof = executiveProductProofTrustCopy(locale).toLowerCase();
    assert.match(proof, /no-go|blocked|zablok|human|człowiek|decyzj/);
    assert.match(proof, /outreach|ats|writeback|kontakt|sync/);
    assert.doesNotMatch(proof, /phase 3b unlocked|p0 solved|launch ready/);
  }
});

test("dashboard and recruiter trust copy state automation pause and human decision", () => {
  for (const locale of [en, pl]) {
    const dash = dashboardTrustCopy(locale).toLowerCase();
    assert.match(dash, /auto-apply.*paused|auto-apply jest wstrzymane/);
    assert.match(dash, /delegated apply.*not live|delegated apply nie jest live/);
    assert.match(dash, /does not make hiring|nie podejmuje decyzji rekrutacyjnej/);

    const recruiter = recruiterTrustCopy(locale).toLowerCase();
    assert.match(recruiter, /recruiter decision|decyzja rekrutera/);
    assert.doesNotMatch(recruiter, /ai decides/);

    const cockpit = recruiterCockpitTrustCopy(locale).toLowerCase();
    assert.match(cockpit, /human|człowiek|ręczn|rekruter/);
    assert.doesNotMatch(cockpit, /ai decides|ai hires/);
    for (const pattern of [/\bguaranteed interview\b/i, /\bautomatic scheduling\b/i]) {
      assert.doesNotMatch(cockpit, pattern, `${pattern} in recruiter cockpit trust copy (${locale})`);
    }

    const talentRadar = talentRadarAtsDemoTrustCopy(locale).toLowerCase();
    assert.match(talentRadar, /recruiter|rekruter|human|człowiek|ręczn|招聘|recruteur|recruiter/);
    assert.doesNotMatch(talentRadar, /ai decides|ai hires|automatic outreach is live/);
    for (const pattern of [/\bguaranteed interview\b/i, /\bautomatic scheduling\b/i]) {
      assert.doesNotMatch(talentRadar, pattern, `${pattern} in talent radar ATS demo trust copy (${locale})`);
    }

    const profileTrust = profilePipelineTrustCopy(locale).toLowerCase();
    assert.match(profileTrust, /recruiter|rekruter|human|człowiek|ręczn|招聘|recruteur|candidat|kandydat/);
    assert.doesNotMatch(profileTrust, /ai decides|ai hires|automatic outreach is live/);
    for (const pattern of [/\bguaranteed interview\b/i, /\bautomatic scheduling\b/i]) {
      assert.doesNotMatch(profileTrust, pattern, `${pattern} in profile pipeline trust copy (${locale})`);
    }
  }
});

const EVIDENCE_DOCS = [
  "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md",
  "docs/FOUNDER_DEMO_CHECKLIST_2026-06-28.md",
  "docs/gate-d-prod-browser-smoke-preflight-2026-06-28.md",
  "docs/gate-d-prod-browser-smoke-result-template-2026-06-28.md",
  "docs/gate-d-prod-browser-smoke-decision-2026-06-28.md",
  "docs/gate-e-phase3b-prerequisites-decision-2026-06-28.md",
] as const;

function readRepoDoc(relativePath: string): string {
  const repoRoot = join(root, "..");
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function hasPositiveDocWorkflowClaim(blob: string, pattern: RegExp): boolean {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const match of blob.matchAll(re)) {
    const idx = match.index ?? 0;
    const lineStart = blob.lastIndexOf("\n", idx) + 1;
    const lineEnd = blob.indexOf("\n", idx);
    const line = blob.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (/\bNOT LIVE\b|\bnot live\b|\bNIE LIVE\b|\bno\b|\bnot\b|\bbez\b|\bforbidden\b/i.test(line)) continue;
    const before = blob.slice(Math.max(0, idx - 28), idx);
    if (/\b(not|no|bez|nie|brak|without|blocked|disabled|off|paused|wstrzym)\s*$/i.test(before)) continue;
    return true;
  }
  return false;
}

test("14 evidence docs avoid launch GO, P0 closed, Phase 3B passed, and live workflow claims", () => {
  const stanceForbidden = [
    /Launch stance:\s*\*\*GO\*\*/i,
    /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/,
    /Phase 3B.*\*\*PASS\*\*/i,
    /Gate D.*\*\*PASS\*\*.*executed/i,
  ];
  const positiveWorkflowForbidden = [
    /\blive ATS writeback\b/i,
    /\boutreach (is )?live\b/i,
    /\bcalendar write(s)? enabled\b/i,
    /\bpayment(s)? active\b/i,
  ];

  for (const doc of EVIDENCE_DOCS) {
    const src = readRepoDoc(doc);
    for (const pattern of stanceForbidden) {
      assert.equal(hasPositiveDocWorkflowClaim(src, pattern), false, `${pattern} in ${doc}`);
    }
    for (const pattern of positiveWorkflowForbidden) {
      assert.equal(hasPositiveDocWorkflowClaim(src, pattern), false, `${pattern} in ${doc}`);
    }
    assert.match(src, /NO-GO|PENDING|not run|NOT RUN|HARD BLOCKED|No public launch/i, doc);
  }
});
