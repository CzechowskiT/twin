/**
 * Static guards — real video sales demo architecture.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 demo page mounts SalesDemoExperience without below-fold junk", () => {
  const page = read("src/app/(marketing)/demo/page.tsx");
  assert.match(page, /SalesDemoExperience/);
  assert.doesNotMatch(page, /FounderLedDemoBelowFold/);
  assert.doesNotMatch(page, /InteractiveDemoSystemMap/);
  assert.doesNotMatch(page, /DemoSurfaceCatalog/);
  assert.doesNotMatch(page, /from "@\/components\/marketing\/demo\/experience\/demo-experience"/);
});

test("2 product film player uses real video element", () => {
  const player = read("src/components/marketing/demo/sales/product-film-player.tsx");
  assert.match(player, /<video/);
  assert.match(player, /type="video\/mp4"/);
  assert.match(player, /type="video\/webm"/);
  assert.match(player, /poster=/);
  assert.doesNotMatch(player, /demo-opening-film/);
});

test("3 analytics exports video events", () => {
  const analytics = read("src/lib/demo/demo-analytics.ts");
  for (const evt of [
    "demo_video_impression",
    "demo_video_play",
    "demo_video_pause",
    "demo_video_complete",
    "demo_video_skip",
    "demo_role_select",
    "demo_interaction",
    "demo_outcome",
    "demo_cta_click",
  ]) {
    assert.match(analytics, new RegExp(evt));
  }
});

test("4 render and validate scripts registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /demo:video:render/);
  assert.match(pkg, /demo:video:validate/);
  assert.match(pkg, /demo:video:visual-validate/);
});

test("5 remotion composition exists with 45s film and dedicated scenes", () => {
  const copy = read("remotion/src/copy.ts");
  assert.match(copy, /FILM_DURATION_SEC = 45/);
  const rootTsx = read("remotion/src/Root.tsx");
  assert.match(rootTsx, /ProductFilmEN/);
  assert.match(rootTsx, /ProductFilmPL/);
  const film = read("remotion/src/ProductFilm.tsx");
  assert.match(film, /SCENE_MAP/);
  assert.match(film, /InboxChaosScene/);
  assert.match(film, /FILM\.bgDark/);
});

test("6 role flow cards expose three sales roles", () => {
  const cards = read("src/components/marketing/demo/sales/role-flow-cards.tsx");
  assert.match(cards, /candidate/);
  assert.match(cards, /recruiter/);
  assert.match(cards, /company/);
  assert.doesNotMatch(cards, /overview/);
});

test("7 i18n demoSales namespace with PL/EN CTAs", () => {
  const i18n = read("src/lib/i18n.ts");
  assert.match(i18n, /ctaWatch: "Watch demo"/);
  assert.match(i18n, /ctaWatch: "Zobacz demo"/);
  assert.match(i18n, /ctaPresentation: "Umów prezentację"/);
});
