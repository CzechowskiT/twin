import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { dictionaries, type Locale } from "../src/lib/i18n";
import { FORBIDDEN_EN_MARKETING, collectRenderedHomeStrings } from "./i18n-rendered-surfaces";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const VISUAL_SURFACES = [
  "src/components/marketing/landing-hero.tsx",
  "src/components/marketing/landing-inside-steps.tsx",
  "src/components/marketing/landing-sticky-cta.tsx",
  "src/components/marketing/landing-cta-band.tsx",
  "src/components/marketing/founding-offer-preview.tsx",
  "src/components/auth/register-hub-conversion.tsx",
  "src/components/auth/login-zone-hub.tsx",
  "src/components/auth/register-zone-hub.tsx",
  "src/app/waitlist/waitlist-page-client.tsx",
] as const;

test("marketing/auth/waitlist components route copy through t()", () => {
  for (const relativePath of VISUAL_SURFACES) {
    const src = readFileSync(join(root, relativePath), "utf8");
    const usesI18n =
      /t\("/.test(src) ||
      /useWaitlistCopy\(/.test(src) ||
      /hubTitleKey=/.test(src) ||
      /RegisterHubConversion/.test(src);
    assert.ok(usesI18n, `${relativePath} must route visible copy through i18n helpers`);
    assert.doesNotMatch(src, />\s*Join founding wishlist\s*</, `${relativePath} hardcoded EN CTA`);
    assert.doesNotMatch(src, />\s*See what's inside\s*</, `${relativePath} hardcoded EN eyebrow`);
  }
});

test("non-EN locale dictionaries pass forbidden-token scan on homepage hero fields", () => {
  const locales: Locale[] = ["es", "de", "fr", "it", "zh", "ja", "ar"];
  for (const locale of locales) {
    const rows = collectRenderedHomeStrings(locale);
    for (const { key, value } of rows) {
      for (const rule of FORBIDDEN_EN_MARKETING) {
        assert.doesNotMatch(value, rule.pattern, `${locale} ${key}: ${rule.label}`);
      }
      const enValue = rows.length ? undefined : undefined;
      void enValue;
      const english = (dictionaries.en as unknown as Record<string, unknown>);
      const parts = key.split(".");
      let enCur: unknown = english;
      for (const p of parts) {
        if (enCur && typeof enCur === "object") enCur = (enCur as Record<string, unknown>)[p];
      }
      if (typeof enCur === "string" && enCur === value) {
        assert.fail(`${locale} ${key} still identical to English`);
      }
    }
  }
});
