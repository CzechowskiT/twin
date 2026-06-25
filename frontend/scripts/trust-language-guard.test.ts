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

function homeTrustCopy(locale: typeof en): string {
  const h = locale.home;
  return [h.feature6Title, h.feature6Line, h.focusFootnote, h.focusChipAuto, h.vacationScene4Body].join("\n");
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

test("i18n dictionaries contain no forbidden live-automation or AI-decides claims", () => {
  for (const locale of LOCALES) {
    const blob = JSON.stringify(dictionaries[locale]);
    for (const pattern of FORBIDDEN_PATTERNS) {
      assert.doesNotMatch(blob, pattern, `${pattern} in dictionaries.${locale}`);
    }
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
  }
});
