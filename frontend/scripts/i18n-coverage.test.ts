import assert from "node:assert/strict";
import test from "node:test";

import { en, dictionaries, LOCALES, type Locale } from "../src/lib/i18n";
import { isPremiumPath } from "../src/lib/overlays/premium/premium-paths";

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

test("every locale has the same key coverage as English", () => {
  for (const locale of LOCALES) {
    const dict = dictionaries[locale];
    const localePaths = new Set(collectStringPaths(dict));
    const missing = enPaths.filter((path) => !localePaths.has(path));
    assert.equal(missing.length, 0, `${locale} missing keys: ${missing.slice(0, 8).join(", ")}`);
  }
});

test("no locale has empty string values", () => {
  for (const locale of LOCALES) {
    const dict = dictionaries[locale];
    const empty = enPaths.filter((path) => getString(dict, path)?.trim() === "");
    assert.equal(empty.length, 0, `${locale} empty keys: ${empty.join(", ")}`);
  }
});

function allowIdenticalPremiumValue(path: string, value: string, locale: Locale): boolean {
  if (value.trim() === ".") return true;
  if (path === "recruiterInbox.cardMetaLine") return true;
  const plValue = getString(dictionaries.pl, path);
  if (locale === "pl" && plValue === value) return true;
  const loanwords =
    /^(Demo|FAQ|Menu|Media|Pipeline|Feedback|Ranking|Manual|Status|Interview|Roadmap|Investor|Jobs|Applications|Contact|Important:|Disclaimer|Top 20|North star|Password)$/i;
  return loanwords.test(value.trim());
}

test("interpolation placeholders match English for every locale string", () => {
  const mismatches: string[] = [];
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    const dict = dictionaries[locale];
    for (const path of enPaths) {
      const enValue = getString(en, path);
      const localeValue = getString(dict, path);
      if (!enValue || !localeValue) continue;
      const enPh = [...enValue.matchAll(/\{[^}]+\}/g)].map((m) => m[0]).sort().join(",");
      const locPh = [...localeValue.matchAll(/\{[^}]+\}/g)].map((m) => m[0]).sort().join(",");
      if (enPh !== locPh) mismatches.push(`${locale}:${path}`);
    }
  }
  assert.equal(
    mismatches.length,
    0,
    `Placeholder drift (${mismatches.length}): ${mismatches.slice(0, 8).join("; ")}`,
  );
});

test("premium product keys are not English fallback for non-EN locales", () => {
  const premiumPaths = enPaths.filter(isPremiumPath);
  const offenders: string[] = [];

  for (const locale of LOCALES) {
    if (locale === "en") continue;
    const dict = dictionaries[locale];
    for (const path of premiumPaths) {
      const enValue = getString(en, path);
      const localeValue = getString(dict, path);
      if (!enValue || !localeValue) continue;
      if (localeValue !== enValue) continue;
      if (allowIdenticalPremiumValue(path, localeValue, locale)) continue;
      offenders.push(`${locale}:${path}`);
    }
  }

  assert.equal(
    offenders.length,
    0,
    `Premium keys still English (${offenders.length}): ${offenders.slice(0, 12).join("; ")}`,
  );
});
