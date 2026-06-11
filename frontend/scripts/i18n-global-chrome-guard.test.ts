import assert from "node:assert/strict";
import test from "node:test";

import type { Locale } from "../src/lib/i18n";
import {
  CHROME_EXACT_BAD_EXAMPLES,
  NON_EN_LOCALES,
  chromeForbiddenHits,
  collectRenderedGlobalChromeStrings,
  equalsEnglish,
  matchesExactBadExample,
} from "./i18n-rendered-surfaces";

const TARGET_LOCALES = NON_EN_LOCALES.filter((l) => l !== "pl") as Locale[];

const CHROME_IDENTICAL_OK = new Set([
  "nav.faq",
  "nav.demo",
  "site.momentumCtaFaq",
]);

function assertNoChromeForbidden(locale: Locale, rows: { key: string; value: string }[]) {
  const offenders: string[] = [];
  for (const { key, value } of rows) {
    if (!value.trim()) continue;
    const hits = chromeForbiddenHits(value, locale);
    if (hits.length) offenders.push(`${key}: ${hits.join(",")}`);
    for (const bad of CHROME_EXACT_BAD_EXAMPLES[locale] ?? []) {
      if (matchesExactBadExample(value, bad)) offenders.push(`${key}: exact ${String(bad)}`);
    }
  }
  assert.equal(
    offenders.length,
    0,
    `${locale} global chrome EN leakage:\n${offenders.slice(0, 12).join("\n")}`,
  );
}

function assertChromeNotEnglish(locale: Locale, rows: { key: string; value: string }[]) {
  const offenders = rows
    .filter(({ key, value }) => value.trim() && !CHROME_IDENTICAL_OK.has(key) && equalsEnglish(key, locale))
    .map(({ key }) => key);
  assert.equal(
    offenders.length,
    0,
    `${locale} global chrome still English: ${offenders.slice(0, 12).join(", ")}`,
  );
}

test("global chrome — no EN leakage on footer/momentum/nav (es–ja)", () => {
  for (const locale of TARGET_LOCALES) {
    const rows = collectRenderedGlobalChromeStrings(locale);
    assertNoChromeForbidden(locale, rows);
    assertChromeNotEnglish(locale, rows);
  }
});

test("ES global chrome — founder-reported strings localized", () => {
  const rows = collectRenderedGlobalChromeStrings("es");
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  assert.match(byKey["site.momentumEyebrow"] ?? "", /Mantén el impulso/i);
  assert.match(byKey["site.footerTagline"] ?? "", /Agente de carrera autónomo/i);
  assert.match(byKey["site.momentumCtaRegister"] ?? "", /Crear cuenta/i);
  assert.match(byKey["site.momentumCtaLogin"] ?? "", /Iniciar sesión/i);
  assert.match(byKey["site.footerWishlist"] ?? "", /lista fundadora/i);
  assert.match(byKey["site.footerPrivacy"] ?? "", /Política de privacidad/i);
  assert.match(byKey["site.footerTerms"] ?? "", /Términos de servicio/i);
  assert.match(byKey["site.footerStatus"] ?? "", /Estado del sistema/i);
  assert.match(byKey["site.footerCookieSettings"] ?? "", /cookies/i);
  assert.match(byKey["site.footerCompany"] ?? "", /Empresa/i);
  assert.match(byKey["site.footerExplore"] ?? "", /Explorar/i);
  assert.match(byKey["nav.cases"] ?? "", /Casos de estudio/i);
  assert.match(byKey["nav.careers"] ?? "", /Carreras/i);
  assert.match(byKey["nav.contact"] ?? "", /Contacto/i);
});

test("PL momentum rail — no English loanwords in authenticated sidebar copy", () => {
  const rows = collectRenderedGlobalChromeStrings("pl");
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const tips = [byKey["site.momentumLead"], byKey["site.momentumTip1"], byKey["site.momentumTip6"]].join(" ");
  assert.doesNotMatch(tips, /\bjob hunt/i);
  assert.doesNotMatch(tips, /\bCRM\b/i);
  assert.doesNotMatch(tips, /\bJD\b/i);
  assert.doesNotMatch(tips, /\bbilling\b/i);
  assert.doesNotMatch(tips, /\bfeed\b/i);
  assert.match(byKey["site.momentumEyebrow"] ?? "", /Utrzymaj tempo/i);
});

test("DE global chrome — founder-reported strings localized", () => {
  const rows = collectRenderedGlobalChromeStrings("de");
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  assert.match(byKey["site.momentumEyebrow"] ?? "", /Schwung beibehalten/i);
  assert.match(byKey["site.footerTagline"] ?? "", /Autonomer Karriere-Agent/i);
  assert.match(byKey["site.momentumCtaRegister"] ?? "", /Konto erstellen/i);
  assert.match(byKey["site.momentumCtaLogin"] ?? "", /Anmelden/i);
  assert.match(byKey["site.footerWishlist"] ?? "", /Gründerliste/i);
  assert.match(byKey["site.footerPrivacy"] ?? "", /Datenschutz/i);
  assert.match(byKey["site.footerTerms"] ?? "", /Nutzungsbedingungen/i);
  assert.match(byKey["site.footerStatus"] ?? "", /Systemstatus/i);
  assert.match(byKey["site.footerCookieSettings"] ?? "", /Cookie/i);
  assert.match(byKey["site.footerCompany"] ?? "", /Unternehmen/i);
  assert.match(byKey["nav.cases"] ?? "", /Fallstudien/i);
  assert.match(byKey["nav.careers"] ?? "", /Karriere/i);
  assert.match(byKey["nav.contact"] ?? "", /Kontakt/i);
});
