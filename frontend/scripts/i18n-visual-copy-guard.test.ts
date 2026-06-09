/**
 * Guard against English leakage on role hubs and related premium surfaces.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { en, dictionaries, LOCALES, type Locale } from "../src/lib/i18n";

const ROLE_KEYS = [
  "candidateTitle",
  "candidateTools",
  "recruiterTitle",
  "recruiterTools",
  "companyTitle",
  "companyTools",
  "investorTitle",
  "investorTools",
  "enterZone",
] as const;

/** Known founder-reported English leaks on German /login (must not appear in DE role hub copy). */
const GERMAN_ROLE_HUB_ENGLISH_LEAKS = [
  "Candidate",
  "Companies",
  "Open workspace",
  "For companies",
  "Scenario calculator",
  "B2B ROI calculator",
] as const;

function roleHubCopy(locale: Locale): string {
  const dict = dictionaries[locale];
  const roles = dict.authRoles;
  const login = dict.login;
  return [
    login.hubTitle,
    login.hubLead,
    ...ROLE_KEYS.map((key) => roles[key]),
  ].join("\n");
}

test("all locales define authRoles keys", () => {
  for (const locale of LOCALES) {
    const roles = dictionaries[locale].authRoles;
    for (const key of ROLE_KEYS) {
      const value = roles[key];
      assert.ok(typeof value === "string" && value.trim(), `${locale} missing authRoles.${key}`);
    }
  }
});

test("non-EN locales do not fall back to English for authRoles", () => {
  const offenders: string[] = [];
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    for (const key of ROLE_KEYS) {
      const enValue = en.authRoles[key];
      const localeValue = dictionaries[locale].authRoles[key];
      if (localeValue === enValue) {
        offenders.push(`${locale}:authRoles.${key}`);
      }
    }
  }
  assert.equal(
    offenders.length,
    0,
    `authRoles still English (${offenders.length}): ${offenders.slice(0, 12).join("; ")}`,
  );
});

test("German role hub copy contains no founder-reported English leaks", () => {
  const copy = roleHubCopy("de");
  for (const leak of GERMAN_ROLE_HUB_ENGLISH_LEAKS) {
    assert.doesNotMatch(
      copy,
      new RegExp(`\\b${leak.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`),
      `German role hub still contains English leak: "${leak}"`,
    );
  }
});
