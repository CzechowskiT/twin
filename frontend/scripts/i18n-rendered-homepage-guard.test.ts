import assert from "node:assert/strict";
import test from "node:test";

import type { Locale } from "../src/lib/i18n";
import {
  EXACT_BAD_EXAMPLES,
  LOCALE_SIGNATURES,
  NON_EN_LOCALES,
  collectRenderedDemoStrings,
  collectRenderedHomeStrings,
  collectRenderedHubStrings,
  collectWaitlistStrings,
  equalsEnglish,
  forbiddenHits,
  matchesExactBadExample,
} from "./i18n-rendered-surfaces";

const TARGET_LOCALES = NON_EN_LOCALES.filter((l) => l !== "pl") as Locale[];

function assertNoForbidden(locale: Locale, rows: { key: string; value: string }[]) {
  const offenders: string[] = [];
  for (const { key, value } of rows) {
    if (!value.trim()) continue;
    const hits = forbiddenHits(value, locale);
    if (hits.length) offenders.push(`${key}: ${hits.join(",")}`);
    for (const bad of EXACT_BAD_EXAMPLES[locale] ?? []) {
      if (matchesExactBadExample(value, bad)) offenders.push(`${key}: exact ${String(bad)}`);
    }
  }
  assert.equal(offenders.length, 0, `${locale} forbidden leakage:\n${offenders.slice(0, 12).join("\n")}`);
}

function assertNotEnglish(locale: Locale, rows: { key: string; value: string }[]) {
  const offenders = rows
    .filter(({ key, value }) => value.trim() && equalsEnglish(key, locale))
    .map(({ key }) => key);
  assert.equal(
    offenders.length,
    0,
    `${locale} still English on rendered keys: ${offenders.slice(0, 12).join(", ")}`,
  );
}

test("homepage rendered keys — no EN marketing leakage (es–ja)", () => {
  for (const locale of TARGET_LOCALES) {
    const rows = collectRenderedHomeStrings(locale);
    assertNoForbidden(locale, rows);
    assertNotEnglish(locale, rows);
  }
});

test("exact bad examples from PR #65 report must not appear", () => {
  assert.match(
    collectRenderedHomeStrings("es").find((r) => r.key === "home.curiosityEyebrow")?.value ?? "",
    /Mira qué hay dentro/i,
  );
  assert.match(
    collectRenderedHomeStrings("es").find((r) => r.key === "home.joinWishlist")?.value ?? "",
    /lista fundadora/i,
  );
  assert.match(
    collectRenderedHomeStrings("de").find((r) => r.key === "home.joinWishlist")?.value ?? "",
    /Gründerliste/i,
  );
  assert.match(
    collectRenderedHomeStrings("es").find((r) => r.key === "home.liveCounter")?.value ?? "",
    /roles escaneados/i,
  );
  assert.match(
    collectRenderedHomeStrings("de").find((r) => r.key === "home.liveCounter")?.value ?? "",
    /Rollen auf aktivierten Börsen gescannt/i,
  );
  assert.match(
    collectRenderedHomeStrings("es").find((r) => r.key === "candidateRewards.eyebrow")?.value ?? "",
    /Gana por resultados/i,
  );
  assert.match(
    collectRenderedHomeStrings("de").find((r) => r.key === "candidateRewards.eyebrow")?.value ?? "",
    /Verdiene an Ergebnissen/i,
  );
  assert.match(
    collectRenderedHomeStrings("es").find((r) => r.key === "candidateRewards.colTrigger")?.value ?? "",
    /Disparador/i,
  );
  assert.match(
    collectRenderedHomeStrings("de").find((r) => r.key === "candidateRewards.colReward")?.value ?? "",
    /Belohnung/i,
  );
  for (const locale of TARGET_LOCALES) {
    for (const row of [
      ...collectRenderedHomeStrings(locale),
      ...collectRenderedHubStrings(locale),
      ...collectRenderedDemoStrings(locale),
      ...collectWaitlistStrings(locale),
    ]) {
      for (const bad of EXACT_BAD_EXAMPLES[locale] ?? []) {
        assert.ok(
          !matchesExactBadExample(row.value, bad),
          `${locale} ${row.key} still has ${String(bad)}`,
        );
      }
    }
  }
});

test("login/register hubs and demo CTAs — localized, no EN leakage", () => {
  for (const locale of TARGET_LOCALES) {
    const rows = [...collectRenderedHubStrings(locale), ...collectRenderedDemoStrings(locale)];
    assertNoForbidden(locale, rows);
    assertNotEnglish(locale, rows);
  }
});

test("waitlist rendered copy — no cross-locale EN marketing tokens", () => {
  for (const locale of TARGET_LOCALES) {
    assertNoForbidden(locale, collectWaitlistStrings(locale));
  }
});

test("wrong-locale signature strings do not leak into other locales", () => {
  for (const [owner, patterns] of Object.entries(LOCALE_SIGNATURES)) {
    for (const locale of TARGET_LOCALES) {
      if (locale === owner) continue;
      const blob = [
        ...collectRenderedHomeStrings(locale),
        ...collectRenderedHubStrings(locale),
        ...collectWaitlistStrings(locale),
      ]
        .map((r) => r.value)
        .join("\n");
      for (const pattern of patterns ?? []) {
        assert.doesNotMatch(blob, pattern, `${locale} leaked ${owner} signature ${pattern}`);
      }
    }
  }
});
