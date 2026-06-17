/**
 * Phase 3B controlled multitab — static guards.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("phase3b route helper and e2e spec exist", () => {
  assert.match(read("e2e/helpers/phase3b-controlled-routes.ts"), /PHASE3B_ROUTE_BATCHES/);
  assert.match(read("e2e/phase3b-controlled-multitab.spec.ts"), /withFreshContext/);
  assert.match(read("e2e/phase3b-controlled-multitab.spec.ts"), /fda75677c306aec76dbb83f65c483f8ba7cbe885/);
});

test("phase3b npm scripts registered workers=1", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:phase3b-controlled-multitab-prod/);
  assert.match(pkg, /--workers=1/);
});

test("phase3b doc references fda7567", () => {
  assert.match(read("../docs/PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md"), /fda7567/);
});
