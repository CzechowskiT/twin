import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { showApplicationTransparency } from "../src/components/dashboard/candidate-application-transparency-panel";
import { en, dictionaries } from "../src/lib/i18n";

const pl = dictionaries.pl;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_PATTERNS = [
  /\bauto-apply is live\b/i,
  /\bdelegated apply is live\b/i,
  /\bKYC verified\b/i,
  /\bguaranteed interview\b/i,
  /\bAI decides\b/i,
  /\bpublic launch\b/i,
  /\blegal compliance certified\b/i,
  /\bfully anonymized inbox\b/i,
];

function panelSource(): string {
  return readFileSync(
    join(root, "src/components/dashboard/candidate-application-transparency-panel.tsx"),
    "utf8",
  );
}

function allTransparencyCopy(locale: typeof en): string {
  const d = locale.dashboard;
  return [
    d.applicationTransparencyTitle,
    d.applicationTransparencyContext,
    d.applicationTransparencyWeShowLabel,
    d.applicationTransparencyWeShowName,
    d.applicationTransparencyWeShowStatus,
    d.applicationTransparencyWeShowMatch,
    d.applicationTransparencyWeShowReviewCard,
    d.applicationTransparencyWeShowRoleInfo,
    d.applicationTransparencyNotShownLabel,
    d.applicationTransparencyNotShownPhone,
    d.applicationTransparencyNotShownEmail,
    d.applicationTransparencyNotShownCv,
    d.applicationTransparencyNotShownAddress,
    d.applicationTransparencyNotShownSensitive,
    d.applicationTransparencyNotShownUnless,
    d.applicationTransparencyImportantLabel,
    d.applicationTransparencyImportant,
    d.applicationTransparencyAutomationLabel,
    d.applicationTransparencyAutomation,
  ].join("\n");
}

test("transparency panel renders for pending, applied, interview, rejected", () => {
  assert.equal(showApplicationTransparency("pending"), true);
  assert.equal(showApplicationTransparency("applied"), true);
  assert.equal(showApplicationTransparency("interview"), true);
  assert.equal(showApplicationTransparency("rejected"), true);
  assert.equal(showApplicationTransparency("hired"), false);
});

test("component uses i18n keys for all sections", () => {
  const src = panelSource();
  const keys = [
    "applicationTransparencyTitle",
    "applicationTransparencyContext",
    "applicationTransparencyWeShowLabel",
    "applicationTransparencyImportant",
    "applicationTransparencyAutomation",
  ];
  for (const key of keys) {
    assert.match(src, new RegExp(`dashboard\\.${key}`), `missing i18n key dashboard.${key}`);
  }
});

test("EN copy includes hiring decision disclaimer and automation pause", () => {
  const copy = allTransparencyCopy(en).toLowerCase();
  assert.match(copy, /does not make hiring decisions/);
  assert.match(copy, /auto-apply is paused/);
  assert.match(copy, /delegated apply is not live/);
});

test("PL copy includes hiring decision disclaimer and automation pause", () => {
  const copy = allTransparencyCopy(pl).toLowerCase();
  assert.match(copy, /nie podejmuje decyzji rekrutacyjnej/);
  assert.match(copy, /auto-apply jest wstrzymane/);
  assert.match(copy, /delegated apply nie jest live/);
});

test("PII not-shown list covers phone, email, CV, address", () => {
  const copy = allTransparencyCopy(en).toLowerCase();
  assert.match(copy, /phone number/);
  assert.match(copy, /email address/);
  assert.match(copy, /full cv text/);
  assert.match(copy, /exact address/);
});

test("transparency copy has no forbidden claims", () => {
  for (const locale of [en, pl]) {
    const copy = allTransparencyCopy(locale);
    for (const pattern of FORBIDDEN_PATTERNS) {
      assert.doesNotMatch(copy, pattern, `${pattern} in ${locale === en ? "EN" : "PL"}`);
    }
  }
});
