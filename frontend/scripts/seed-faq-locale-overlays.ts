/**
 * One-shot generator for faq/{locale}.ts supplemental overlays (82 keys × 7 locales).
 * Run: npx tsx scripts/seed-faq-locale-overlays.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { FAQ_MESSAGES_EN } from "../src/lib/faq-messages";
import { FAQ_LOCALE_SUPPLEMENTAL } from "./faq-locale-supplemental-data";

const SKIP_KEYS = new Set([
  "homeTeaserLead",
  "homeCta",
  "homeCtaHint",
  "sectionGeneral",
  "sectionCandidates",
  "sectionRecruiters",
  "sectionCompanies",
  "sectionInvestors",
  "general01Q",
  "general01A",
  "general02Q",
  "general02A",
  "general03Q",
  "general03A",
]);

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../src/lib/overlays/faq");
mkdirSync(outDir, { recursive: true });

for (const [locale, entries] of Object.entries(FAQ_LOCALE_SUPPLEMENTAL)) {
  const missing = Object.keys(FAQ_MESSAGES_EN).filter((k) => !SKIP_KEYS.has(k));
  const gaps = missing.filter((k) => !entries[k]);
  if (gaps.length) {
    throw new Error(`${locale} missing supplemental keys: ${gaps.slice(0, 5).join(", ")} (${gaps.length} total)`);
  }
  const lines = Object.entries(entries)
    .filter(([k]) => !SKIP_KEYS.has(k))
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`);
  const body = `import type { FaqLocaleOverlay } from "./types";

/** Supplemental FAQ copy for ${locale} — merged after marketing-home-below-fold partial FAQ. */
export const faq${locale[0].toUpperCase()}${locale.slice(1)}: FaqLocaleOverlay = {
${lines.join("\n")}
};
`;
  const exportNames: Record<string, string> = {
    es: "faqEs",
    de: "faqDe",
    fr: "faqFr",
    it: "faqIt",
    zh: "faqZh",
    ar: "faqAr",
    ja: "faqJa",
  };
  const exportName = exportNames[locale] ?? `faq${locale}`;
  writeFileSync(
    join(outDir, `${locale}.ts`),
    body.replace(`faq${locale[0].toUpperCase()}${locale.slice(1)}`, exportName),
  );
  console.log(`wrote ${locale}.ts (${lines.length} keys)`);
}
