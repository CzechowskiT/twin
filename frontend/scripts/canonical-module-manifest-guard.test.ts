/**
 * Canonical module manifest presence guard.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("canonical module manifest exists and references Hard LIVE registry", () => {
  const path = join(root, "docs/CANONICAL_MODULE_MANIFEST.md");
  assert.ok(existsSync(path));
  const doc = readFileSync(path, "utf8");
  assert.match(doc, /HARD_LIVE_EVIDENCE_REGISTRY/);
  assert.match(doc, /CANONICAL_PRODUCT_CAPABILITY_MAP/);
  assert.match(doc, /MODULE/);
  assert.match(doc, /CAPABILITY/);
  assert.match(doc, /Do not delete MODULE rows/);
});

test("hard live registry still has no DEMO_ONLY / PENDING_SMOKE", () => {
  const raw = readFileSync(join(root, "docs/HARD_LIVE_EVIDENCE_REGISTRY.json"), "utf8");
  assert.doesNotMatch(raw, /"status": "DEMO_ONLY"/);
  assert.doesNotMatch(raw, /"status": "PENDING_SMOKE"/);
});
