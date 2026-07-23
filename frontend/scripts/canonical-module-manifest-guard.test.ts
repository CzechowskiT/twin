/**
 * Canonical module manifest presence guard.
 * Fails if any Hard LIVE HELD/BLOCKED module is missing from the manifest inventory.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { HARD_LIVE_EVIDENCE_REGISTRY } from "../src/lib/hard-live-evidence-registry";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const HELD_OR_BLOCKED = new Set([
  "HELD_POLICY",
  "BLOCKED",
  "BLOCKED_EXTERNAL_CREDENTIALS",
]);

test("canonical module manifest exists and references Hard LIVE registry", () => {
  const path = join(root, "docs/CANONICAL_MODULE_MANIFEST.md");
  assert.ok(existsSync(path));
  const doc = readFileSync(path, "utf8");
  assert.match(doc, /HARD_LIVE_EVIDENCE_REGISTRY/);
  assert.match(doc, /CANONICAL_PRODUCT_CAPABILITY_MAP/);
  assert.match(doc, /MODULE/);
  assert.match(doc, /CAPABILITY/);
  assert.match(doc, /Do not delete MODULE rows/);
  assert.match(doc, /Hard LIVE HELD \/ BLOCKED inventory/);
});

test("hard live registry still has no DEMO_ONLY / PENDING_SMOKE", () => {
  const raw = readFileSync(join(root, "docs/HARD_LIVE_EVIDENCE_REGISTRY.json"), "utf8");
  assert.doesNotMatch(raw, /"status": "DEMO_ONLY"/);
  assert.doesNotMatch(raw, /"status": "PENDING_SMOKE"/);
});

test("every Hard LIVE HELD/BLOCKED module is listed with class and blocker", () => {
  const doc = readFileSync(join(root, "docs/CANONICAL_MODULE_MANIFEST.md"), "utf8");
  const held = HARD_LIVE_EVIDENCE_REGISTRY.filter((r) => HELD_OR_BLOCKED.has(r.status));
  assert.ok(held.length >= 1, "expected at least one held/blocked module");

  const missing: string[] = [];
  for (const row of held) {
    // Row format: | module_id | STATUS | class | blocker |
    const lineRe = new RegExp(
      `\\|\\s*${row.module_id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\|\\s*${row.status}\\s*\\|\\s*[A-F]\\s*\\|\\s*${(row.blocker || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\|`,
    );
    if (!lineRe.test(doc)) {
      missing.push(`${row.module_id} (${row.status} / ${row.blocker})`);
    }
  }
  assert.equal(
    missing.length,
    0,
    `Unmapped Hard LIVE HELD/BLOCKED modules missing from CANONICAL_MODULE_MANIFEST.md:\n${missing.join("\n")}`,
  );
});

test("manifest does not invent held modules absent from registry", () => {
  const doc = readFileSync(join(root, "docs/CANONICAL_MODULE_MANIFEST.md"), "utf8");
  const inventoryStart = doc.indexOf("## Hard LIVE HELD / BLOCKED inventory");
  assert.ok(inventoryStart >= 0);
  const section = doc.slice(inventoryStart, doc.indexOf("\n## ", inventoryStart + 1));
  const listed = [...section.matchAll(/^\|\s*([a-z0-9_]+)\s*\|/gm)].map((m) => m[1]);
  const registryIds = new Set(HARD_LIVE_EVIDENCE_REGISTRY.map((r) => r.module_id));
  const orphans = listed.filter((id) => id !== "module_id" && !registryIds.has(id));
  assert.equal(orphans.length, 0, `Manifest lists unknown module_ids: ${orphans.join(", ")}`);
});
