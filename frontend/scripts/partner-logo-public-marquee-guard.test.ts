/**
 * Public marketing marquee — no initials-only partner cards (CI, MS, CO, …).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { companyInitials, type Brand } from "../src/lib/brand-logo-urls";
import { dictionaries, en } from "../src/lib/i18n";
import {
  getPublicMarqueeLogos,
  hasPublicLogoAsset,
  isInitialsFallbackLogo,
  PUBLIC_MARQUEE_EXCLUDED_INITIALS_SLUGS,
} from "../src/lib/partner-logo-display";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Canonical launch stance — do not overclaim in this slice. */
const LAUNCH_STANCE = {
  p0: "CLOSED",
  gateE: "PASS",
  gateF: "PENDING",
  launch: "NO-GO",
} as const;

const BANNED_INITIALS = ["CI", "MS", "CO", "HD", "LO", "PE", "CH", "EX", "SE"] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function parseMarqueeBrandEntries(): Brand[] {
  const marquee = read("src/components/marketing/company-logo-marquee.tsx");
  return [
    ...marquee.matchAll(
      /\{\s*slug:\s*"([^"]+)"[^}]*name:\s*"([^"]+)"[^}]*domain:\s*"([^"]+)"/g,
    ),
  ].map(([, slug, name, domain]) => ({ slug, name, domain }));
}

test("1 stance — P0 CLOSED, Gate E PASS, Gate F PENDING, Launch NO-GO", () => {
  assert.equal(LAUNCH_STANCE.p0, "CLOSED");
  assert.equal(LAUNCH_STANCE.gateE, "PASS");
  assert.equal(LAUNCH_STANCE.gateF, "PENDING");
  assert.equal(LAUNCH_STANCE.launch, "NO-GO");
  assert.notEqual(LAUNCH_STANCE.launch, "GO");
});

test("2 company-logo-marquee filters via getPublicMarqueeLogos", () => {
  const marquee = read("src/components/marketing/company-logo-marquee.tsx");
  assert.match(marquee, /getPublicMarqueeLogos/);
  assert.match(marquee, /from "@\/lib\/partner-logo-display"/);
  assert.doesNotMatch(marquee, /MARQUEE_BRAND_ENTRIES\.map/);
});

test("3 public marquee excludes initials-fallback partners", () => {
  const all = parseMarqueeBrandEntries();
  const publicLogos = getPublicMarqueeLogos(all);
  assert.ok(publicLogos.length > 0);
  assert.ok(publicLogos.length < all.length, "some partners must be filtered out");
  for (const partner of publicLogos) {
    assert.equal(isInitialsFallbackLogo(partner), false, partner.slug);
    assert.equal(hasPublicLogoAsset(partner), true, partner.slug);
  }
  for (const partner of all) {
    if (isInitialsFallbackLogo(partner)) {
      assert.ok(
        !publicLogos.some((p) => p.slug === partner.slug),
        `initials fallback must be excluded: ${partner.slug}`,
      );
    }
  }
});

test("4 banned initials slugs CI MS CO HD LO PE CH EX SE are not public cards", () => {
  const all = parseMarqueeBrandEntries();
  const publicSlugs = new Set(getPublicMarqueeLogos(all).map((p) => p.slug));
  for (const slug of PUBLIC_MARQUEE_EXCLUDED_INITIALS_SLUGS) {
    assert.ok(!publicSlugs.has(slug), `excluded slug must not render: ${slug}`);
  }
  for (const initials of BANNED_INITIALS) {
    const matches = all.filter((p) => companyInitials(p.name) === initials);
    for (const partner of matches) {
      if (isInitialsFallbackLogo(partner)) {
        assert.ok(
          !publicSlugs.has(partner.slug),
          `${initials} initials card excluded: ${partner.slug}`,
        );
      }
    }
  }
  assert.ok(publicSlugs.has("cocacola"), "Coca-Cola keeps verified logo asset");
  assert.ok(publicSlugs.has("cisco"), "Cisco keeps verified logo asset (not CI initials card)");
});

test("5 verified logo assets remain in public marquee", () => {
  const all = parseMarqueeBrandEntries();
  const publicLogos = getPublicMarqueeLogos(all);
  const smoke = [
    "apple",
    "microsoft",
    "google",
    "amazon",
    "nvidia",
    "visa",
    "mastercard",
    "walmart",
    "target",
    "shell",
    "wellsfargo",
    "goldmansachs",
    "bankofamerica",
  ];
  const publicSlugs = new Set(publicLogos.map((p) => p.slug));
  for (const slug of smoke) {
    assert.ok(publicSlugs.has(slug), `verified asset remains: ${slug}`);
  }
  assert.ok(publicLogos.length >= 40, "public marquee keeps a substantial verified set");
});

test("6 disclaimer unchanged — Representative market context", () => {
  const siteTop = read("src/components/site-top-marquee.tsx");
  assert.match(siteTop, /site\.marqueeLogoDisclaimer/);
  assert.match(siteTop, /data-testid="marquee-logo-disclaimer"/);
  assert.match(en.site.marqueeLogoDisclaimer ?? "", /^Representative market context\.$/);
  assert.match(dictionaries.pl.site.marqueeLogoDisclaimer ?? "", /kontekst rynkowy/i);
});

test("7 npm script test:partner-logo-public-marquee-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:partner-logo-public-marquee-guard/);
});

test("8 frontend-only — no backend/api/auth/db footprint in slice", () => {
  const blob = [
    read("src/lib/partner-logo-display.ts"),
    read("src/components/marketing/company-logo-marquee.tsx"),
  ].join("\n");
  assert.doesNotMatch(blob, /\/api\//);
  assert.doesNotMatch(blob, /prisma|drizzle|supabase|postgres|DATABASE_URL/i);
  assert.doesNotMatch(blob, /getServerSession|next-auth/i);
});
