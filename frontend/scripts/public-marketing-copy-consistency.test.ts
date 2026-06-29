/**
 * Slice 27 — public marketing EN/PL copy consistency (static, no browser).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { dictionaries, en } from "../src/lib/i18n";

const pl = dictionaries.pl;

const FORBIDDEN_MARKETING_PATTERNS: RegExp[] = [
  /\blaunch ready\b/i,
  /\bproduction ready\b/i,
  /\bphase 3b passed\b/i,
  /\bp0 closed\b/i,
  /\blive ats\b/i,
  /\bats writeback completed\b/i,
  /\boutreach sent\b/i,
  /\bautomatic outreach is live\b/i,
  /\bcalendar write\b/i,
  /\bcalendar writes enabled\b/i,
  /\bpayment active\b/i,
  /\bgdpr compliant\b/i,
  /\bidentity verified\b/i,
];

function marketingBlob(locale: typeof en): string {
  return JSON.stringify({
    nav: locale.nav,
    site: locale.site,
    home: locale.home,
    investorFundraising: locale.investorFundraising,
    investorRoom: locale.investorRoom,
    executiveProductProof: locale.executiveProductProof,
    demo: locale.demo,
    marketingHowItWorks: locale.marketingHowItWorks,
    meta: locale.meta,
  });
}

function hasPositiveForbiddenClaim(blob: string, pattern: RegExp): boolean {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const match of blob.matchAll(re)) {
    const idx = match.index ?? 0;
    const before = blob.slice(Math.max(0, idx - 28), idx);
    if (/\b(not|no|bez|nie|brak|without|blocked|disabled|off|paused|wstrzym)\s*$/i.test(before)) continue;
    return true;
  }
  return false;
}

test("12 PL marketing labels use canonical public terminology", () => {
  assert.equal(pl.nav.exploreTwin, "Poznaj TWIN");
  assert.equal(pl.site.footerForInvestors, "Dla inwestorów");
  assert.equal(pl.site.footerInvestorRoom, "Sala executive");
  assert.equal(pl.nav.exploreProductProof, "Dowód produktu");
  assert.equal(pl.home.exploreTwinTrustTitle, "Centrum zaufania");
  assert.equal(pl.nav.howItWorks, "Jak to działa");
  assert.equal(pl.home.exploreTwinHowItWorksTitle, "Jak to działa");
});

test("12 EN marketing labels use canonical public terminology", () => {
  assert.equal(en.nav.exploreTwin, "Explore TWIN");
  assert.equal(en.site.footerForInvestors, "For Investors");
  assert.equal(en.site.footerInvestorRoom, "Investor Room");
  assert.equal(en.nav.exploreProductProof, "Product Proof");
  assert.equal(en.home.exploreTwinTrustTitle, "Trust Center");
  assert.equal(en.nav.howItWorks, "How it works");
  assert.equal(en.home.exploreTwinHowItWorksTitle, "How it works");
});

test("12 /for-investors and /investor labels stay distinct in EN and PL", () => {
  assert.notEqual(en.site.footerForInvestors, en.site.footerInvestorRoom);
  assert.notEqual(pl.site.footerForInvestors, pl.site.footerInvestorRoom);
  assert.notEqual(en.investorFundraising.eyebrow, en.investorRoom.eyebrow);
  assert.notEqual(pl.investorFundraising.eyebrow, pl.investorRoom.eyebrow);
  assert.match(en.investorFundraising.eyebrow, /For Investors/i);
  assert.match(en.investorRoom.eyebrow, /Investor Room/i);
  assert.match(pl.investorFundraising.eyebrow, /Dla inwestorów/i);
  assert.match(pl.investorRoom.eyebrow, /Sala executive/i);
});

test("12 product proof copy avoids launch-ready or production-ready claims", () => {
  for (const locale of [en, pl] as const) {
    const blob = [
      locale.executiveProductProof.lead,
      locale.executiveProductProof.pageEyebrow,
      locale.home.exploreTwinProductProofTitle,
      locale.home.exploreTwinProductProofHint,
      locale.investorFundraising.ctaProductProof,
    ].join("\n");
    assert.equal(hasPositiveForbiddenClaim(blob, /\blaunch ready\b/i), false);
    assert.equal(hasPositiveForbiddenClaim(blob, /\bproduction ready\b/i), false);
  }
});

test("12 trust center copy avoids live compliance automation claims", () => {
  for (const locale of [en, pl] as const) {
    const blob = [
      locale.home.exploreTwinTrustHint,
      locale.hiringJourney.moduleTrustCenter,
      locale.hiringJourney.stepTrustEvidence,
    ].join("\n").toLowerCase();
    assert.doesNotMatch(blob, /gdpr compliant|identity verified|kyc passed|live compliance automation/);
    assert.match(blob, /read-only|podgląd|preview|bez roszczeń|no legal verification/);
  }
});

test("12 demo copy avoids live external workflow claims", () => {
  for (const locale of [en, pl] as const) {
    const blob = [
      locale.demo.pageLead,
      locale.demo.syntheticBadge,
      locale.demo.heroPipelineBody,
      locale.demo.statusPreparedBody,
    ].join("\n").toLowerCase();
    assert.match(blob, /synthetic|sample|symul|demonstration|does not submit|nie wysyła/);
    assert.equal(hasPositiveForbiddenClaim(blob, /\boutreach sent\b/i), false);
    assert.equal(hasPositiveForbiddenClaim(blob, /\bautomatic outreach is live\b/i), false);
    assert.equal(hasPositiveForbiddenClaim(blob, /\bapplies automatically\b/i), false);
  }
});

test("12 public marketing i18n avoids forbidden live-automation phrases", () => {
  for (const locale of [en, pl] as const) {
    const blob = marketingBlob(locale);
    for (const pattern of FORBIDDEN_MARKETING_PATTERNS) {
      assert.equal(hasPositiveForbiddenClaim(blob, pattern), false, `${pattern} in marketing`);
    }
  }
});
