/**
 * Seven-day D1 marketing slice — static guard (homepage, for-*, thin pages, social proof, logo).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { dictionaries, en } from "../src/lib/i18n";
import { getPersonaBundle } from "../src/lib/persona-pages";
import {
  FOOTER_SOCIAL_PROOF_ILLUSTRATIVE_LABELS,
  HEADER_DEMO_CTA_HREF,
  HIDE_THIN_MARKETING_NAV_LINKS,
  HOMEPAGE_PRIMARY_CTA_HREF,
  MARK_ILLUSTRATIVE_SOCIAL_PROOF,
  SUBTLE_MARQUEE_LOGO_DISCLAIMER,
  THIN_MARKETING_PATHS,
} from "../src/lib/seven-day-d1-marketing";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const D1_DOC = "docs/SEVEN_DAY_D1_MARKETING_EXECUTION_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function hasPositiveClaim(blob: string, pattern: RegExp): boolean {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const match of blob.matchAll(re)) {
    const idx = match.index ?? 0;
    const before = blob.slice(Math.max(0, idx - 36), idx);
    if (/\b(not|no|bez|nie|brak|without|paused|wstrzym|roadmap|coming soon|wkrótce|scaffold|pilotaż|pilot|preview|podgląd|illustrative|founder-led)\s*$/i.test(before)) {
      continue;
    }
    return true;
  }
  return false;
}

test("1 D1 execution doc exists with stance footer", () => {
  const doc = readRepo(D1_DOC);
  assert.match(doc, /Seven-day D1/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
  assert.match(doc, /NOT Launch GO/);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
});

test("2 homepage CTA — waitlist primary, register secondary text link, demo in header", () => {
  assert.equal(HOMEPAGE_PRIMARY_CTA_HREF, "/waitlist");
  assert.equal(HEADER_DEMO_CTA_HREF, "/demo");
  const hero = read("src/components/marketing/landing-hero.tsx");
  const ctaBand = read("src/components/marketing/landing-cta-band.tsx");
  const sticky = read("src/components/marketing/landing-sticky-cta.tsx");
  const header = read("src/components/site-header-bar.tsx");
  assert.match(hero, /href="\/waitlist"[\s\S]*twin-header-cta|twin-nav-waitlist-pill/);
  assert.match(hero, /href="\/register"[\s\S]*twin-link/);
  assert.doesNotMatch(hero, /href="\/register"[\s\S]{0,80}section-cta-primary/);
  assert.match(ctaBand, /href="\/waitlist"/);
  assert.match(ctaBand, /href="\/register"[\s\S]*twin-link/);
  assert.match(sticky, /href="\/waitlist"/);
  assert.match(header, /showHeaderDemoCta/);
  assert.match(header, /href="\/demo"/);
});

test("3 for-* pages avoid overclaim — ATS sync, delegated apply, MS calendar, marketplace liquidity", () => {
  const forbidden = [
    /\blive ats sync\b/i,
    /\bats writeback is live\b/i,
    /\bdelegated apply is live\b/i,
    /\bmicrosoft calendar sync is live\b/i,
    /\bmarketplace liquidity\b/i,
    /\bverified case stud(y|ies)\b/i,
  ];
  for (const persona of ["candidates", "recruiters", "companies"] as const) {
    const blob = JSON.stringify(getPersonaBundle(persona, "en"));
    for (const pattern of forbidden) {
      assert.equal(hasPositiveClaim(blob, pattern), false, `${persona}: ${pattern}`);
    }
  }
  const recruiters = getPersonaBundle("recruiters", "en");
  assert.match(recruiters.heroLead, /pilot|roadmap|invite/i);
  assert.match(recruiters.pricingFootnote ?? "", /paused|not live/i);
  const companies = getPersonaBundle("companies", "en");
  assert.match(companies.heroLead, /procurement|ROI|roadmap/i);
  assert.match(JSON.stringify(companies.tiers), /coming soon|roadmap|scaffold|pilot|preview|where configured/i);
});

test("4 thin marketing pages hidden from nav or coming-soon surface", () => {
  assert.equal(HIDE_THIN_MARKETING_NAV_LINKS, true);
  assert.deepEqual([...THIN_MARKETING_PATHS], ["/partners", "/careers", "/media"]);
  const footer = read("src/components/site-footer.tsx");
  const header = read("src/components/site-header-bar.tsx");
  assert.match(footer, /HIDE_THIN_MARKETING_NAV_LINKS/);
  assert.match(header, /THIN_MARKETING_PATHS/);
  for (const path of THIN_MARKETING_PATHS) {
    const page = read(`src/app/(marketing)${path}/page.tsx`);
    assert.match(page, /MarketingComingSoonSurface/);
  }
  const testimonials = read("src/app/(marketing)/testimonials/page.tsx");
  const cases = read("src/app/(marketing)/case-studies/page.tsx");
  assert.match(testimonials, /MARK_ILLUSTRATIVE_SOCIAL_PROOF/);
  assert.match(cases, /MARK_ILLUSTRATIVE_SOCIAL_PROOF|site\.casesDisclaimer/);
});

test("5 logo disclaimer — subtle premium copy, no defensive not-all-customers text", () => {
  assert.equal(SUBTLE_MARQUEE_LOGO_DISCLAIMER, true);
  const marquee = read("src/components/site-top-marquee.tsx");
  assert.match(marquee, /site\.marqueeLogoDisclaimer/);
  assert.match(en.site.marqueeLogoDisclaimer ?? "", /Representative market context/i);
  assert.match(dictionaries.pl.site.marqueeLogoDisclaimer ?? "", /kontekst rynkowy/i);
  const repo = readRepo("frontend/src/lib/site-messages.ts");
  assert.doesNotMatch(repo, /not all customers/i);
  assert.doesNotMatch(repo, /nie wszyscy klienci/i);
});

test("6 social proof illustrative — homepage must not imply Fortune 500 customers", () => {
  assert.equal(MARK_ILLUSTRATIVE_SOCIAL_PROOF, true);
  assert.equal(FOOTER_SOCIAL_PROOF_ILLUSTRATIVE_LABELS, true);
  const liveProof = read("src/components/marketing/landing-live-proof.tsx");
  assert.match(liveProof, /socialProofIllustrativeNote|illustrativeExamplesBadge/);
  assert.match(en.productPolish.socialProofIllustrativeNote ?? "", /not verified/i);
  const homeBlob = JSON.stringify(en.home);
  assert.doesNotMatch(homeBlob, /Fortune 500.*customer/i);
  assert.doesNotMatch(homeBlob, /our customers include/i);
});

test("7 for-companies footer uses i18n — no hardcoded marketing strings", () => {
  const page = read("src/app/(marketing)/for-companies/page.tsx");
  assert.match(page, /t\("site\.companySignupTitle"\)/);
  assert.match(page, /t\("site\.companySignupCompareAgencies"\)/);
  assert.doesNotMatch(page, />Company signup</);
  assert.doesNotMatch(page, />TWIN vs agencies</);
});

test("8 recruiter and company persona pages show limited-launch footnote", () => {
  const personaPage = read("src/components/marketing/persona-marketing-page.tsx");
  assert.match(personaPage, /marketingLimitedLaunchFootnote/);
  assert.match(en.persona.marketingLimitedLaunchFootnote ?? "", /Limited launch|Preview|pilot|Coming Soon/i);
});

test("9 npm script test:seven-day-d1-marketing-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:seven-day-d1-marketing-guard":/);
  assert.match(pkg, /seven-day-d1-marketing-guard\.test\.ts/);
});
