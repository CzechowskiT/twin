import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  INVESTOR_ROOM_ROUTE,
  INVESTOR_ROOM_STATUS,
  INVESTOR_ROOM_STATUS_ITEM_IDS,
  INVESTOR_ROOM_VISUAL_MARKERS,
} from "../src/lib/investor-room";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const FORBIDDEN_FAKE_CLAIMS: RegExp[] = [
  /\braised \$/i,
  /\bseries [abc]\b/i,
  /\bcommitted investors?\b/i,
  /\bthousands of (users|candidates|recruiters)\b/i,
  /\bmillions of (users|candidates)\b/i,
  /\b\d+\+?\s*(customers|clients|enterprises)\b/i,
  /\bwe closed\b/i,
  /\b\d{2,}k?\s*mrr\b/i,
  /\b\d{2,}k?\s*arr\b/i,
];

const FORBIDDEN_LAUNCH_GO: RegExp[] = [
  /\bpublic launch\s+go\b/i,
  /\blaunch\s+go\b/i,
  /\bwe are live\b/i,
  /\bnow live for everyone\b/i,
  /\bgeneral availability\b/i,
  /\bga launch\b/i,
];

test("investor room route and page module exist", () => {
  assert.equal(INVESTOR_ROOM_ROUTE, "/investor");
  assert.match(readSrc("src/app/investor/page.tsx"), /InvestorRoomPage/);
  assert.match(readSrc("src/app/(marketing)/for-investors/page.tsx"), /InvestorRoomPage/);
  assert.match(readSrc("src/components/investor/investor-room-page.tsx"), /data-testid="investor-room-page"/);
});

test("reality status sections exist with live, demo, and not-live tiers", () => {
  const panel = readSrc("src/components/investor/investor-room-page.tsx");
  assert.match(panel, new RegExp(INVESTOR_ROOM_VISUAL_MARKERS.statusSection));
  assert.match(panel, /data-status-tier=\{tier\}/);
  assert.match(panel, /"live", "demo", "notLive"/);
  assert.match(panel, /investor-room-launch-stance/);

  const tiers = new Set(Object.values(INVESTOR_ROOM_STATUS));
  assert.ok(tiers.has("live"));
  assert.ok(tiers.has("demo"));
  assert.ok(tiers.has("notLive"));
});

test("not-live items are clearly marked in status model", () => {
  const notLive = INVESTOR_ROOM_STATUS_ITEM_IDS.filter((id) => INVESTOR_ROOM_STATUS[id] === "notLive");
  assert.ok(notLive.includes("publicLaunch"));
  assert.ok(notLive.includes("autoApply"));
  assert.ok(notLive.includes("delegatedApply"));
  for (const id of notLive) {
    const body = en.investorRoom[`statusItem_${id}_body` as keyof typeof en.investorRoom] ?? "";
    assert.match(String(body).toLowerCase(), /not live|no-go|paused|blocked|placeholder|roadmap|nie live|wstrzym/i);
  }
});

test("investor room copy avoids fake traction and fundraising claims", () => {
  const blob = JSON.stringify(en.investorRoom);
  for (const pattern of FORBIDDEN_FAKE_CLAIMS) {
    assert.doesNotMatch(blob, pattern, `${pattern} in investorRoom en`);
  }
});

test("investor room copy avoids public launch GO language", () => {
  const blob = JSON.stringify(en.investorRoom);
  for (const pattern of FORBIDDEN_LAUNCH_GO) {
    assert.doesNotMatch(blob, pattern, `${pattern} in investorRoom en`);
  }
  assert.match(en.investorRoom.launchStanceBody.toLowerCase(), /no-go/);
  assert.match(en.investorRoom.statusItem_publicLaunch_body.toLowerCase(), /no-go|blocked/);
});

test("all locales include investorRoom keys", () => {
  const enKeys = Object.keys(en.investorRoom);
  for (const locale of LOCALES) {
    const section = dictionaries[locale].investorRoom;
    assert.ok(section, `missing investorRoom for ${locale}`);
    for (const key of enKeys) {
      const val = section[key as keyof typeof section];
      assert.ok(val?.length, `${locale}.investorRoom.${key} empty`);
    }
  }
});
