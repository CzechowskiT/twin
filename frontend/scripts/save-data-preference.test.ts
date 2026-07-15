/**
 * Save-data preference — unit tests for CSS media + navigator.connection.saveData.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 readSaveDataPreference checks media query and connection.saveData", () => {
  const mod = read("src/lib/demo/save-data-preference.ts");
  assert.match(mod, /prefers-reduced-data/);
  assert.match(mod, /navigatorConnection/);
  assert.match(mod, /saveData/);
  assert.match(mod, /subscribeSaveDataPreference/);
});

test("2 sales experience uses shared save-data reader", () => {
  const experience = read("src/components/marketing/demo/sales/sales-demo-experience.tsx");
  assert.match(experience, /readSaveDataPreference/);
  assert.match(experience, /data-demo-poster-fallback/);
  assert.match(experience, /showRoles = filmDone \|\| reducedMotion \|\| saveData/);
});

test("3 product film player skips render when saveData", () => {
  const player = read("src/components/marketing/demo/sales/product-film-player.tsx");
  assert.match(player, /reducedMotion \|\| saveData/);
});

test("4 founder-review harness mocks navigator.connection.saveData", () => {
  const runner = read("scripts/run-demo-founder-review-prod.ts");
  assert.match(runner, /saveData: true/);
  assert.match(runner, /data-sales-demo-roles/);
});
