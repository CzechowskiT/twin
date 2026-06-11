import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  FOUNDER_UPDATES,
  MILESTONE_ITEMS,
  RISK_ITEMS,
  ROADMAP_PHASES,
} from "../src/lib/investor-founder-roadmap";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const FORBIDDEN_FAKE_CLAIMS: RegExp[] = [
  /\blaunching on\b/i,
  /\blaunch date\b/i,
  /\bseries [abc]\b/i,
  /\braised \$/i,
  /\bcommitted investors?\b/i,
  /\bthousands of users\b/i,
  /\bmillions of users\b/i,
  /\bwe closed\b/i,
];

test("roadmap route and panel module exist", () => {
  assert.match(readSrc("src/app/investor/roadmap/page.tsx"), /InvestorRoadmapFounderUpdatesPanel/);
  assert.match(
    readSrc("src/components/investor/investor-roadmap-founder-updates-panel.tsx"),
    /data-testid="investor-roadmap-founder-updates"/,
  );
  assert.match(readSrc("src/app/workspace/investor/page.tsx"), /\/investor\/roadmap/);
});

test("now, next, and later phases are present", () => {
  const panel = readSrc("src/components/investor/investor-roadmap-founder-updates-panel.tsx");
  assert.match(panel, /data-phase=\{phase\}/);
  assert.equal(ROADMAP_PHASES.length, 3);
  assert.match(en.investorRoadmap.nowTitle, /Now/i);
  assert.match(en.investorRoadmap.nextTitle, /Next/i);
  assert.match(en.investorRoadmap.laterTitle, /Later/i);
});

test("risks and validation milestones sections exist", () => {
  assert.ok(RISK_ITEMS.length >= 3);
  assert.ok(MILESTONE_ITEMS.length >= 3);
  assert.match(en.investorRoadmap.risksTitle.toLowerCase(), /risk/);
  assert.match(en.investorRoadmap.milestonesTitle.toLowerCase(), /milestone/);
  assert.match(en.investorRoadmap.h5cStatus.toLowerCase(), /hold/);
});

test("founder update cards are wired", () => {
  assert.ok(FOUNDER_UPDATES.length >= 3);
  for (const id of FOUNDER_UPDATES) {
    const titleKey = `${id}Title` as keyof typeof en.investorRoadmap;
    const bodyKey = `${id}Body` as keyof typeof en.investorRoadmap;
    assert.ok(en.investorRoadmap[titleKey]?.length);
    assert.ok(en.investorRoadmap[bodyKey]?.length);
  }
});

test("roadmap copy avoids fake launch dates, commitments, and traction", () => {
  const blob = JSON.stringify(en.investorRoadmap);
  for (const pattern of FORBIDDEN_FAKE_CLAIMS) {
    assert.doesNotMatch(blob, pattern, `${pattern} in investorRoadmap en`);
  }
  assert.match(en.investorRoadmap.launchStanceHeadline.toLowerCase(), /no-go/);
  assert.match(en.investorRoadmap.honestyNote.toLowerCase(), /not/);
});

test("all locales include investorRoadmap keys", () => {
  const enKeys = Object.keys(en.investorRoadmap);
  for (const locale of LOCALES) {
    const section = dictionaries[locale].investorRoadmap;
    for (const key of enKeys) {
      assert.ok(section[key as keyof typeof section], `${locale} missing investorRoadmap.${key}`);
    }
  }
});

test("source docs referenced in repo", () => {
  assert.match(readSrc("../docs/INVESTOR_ROADMAP_FOUNDER_UPDATES_2026-06-11.md"), /NO-GO/);
});
