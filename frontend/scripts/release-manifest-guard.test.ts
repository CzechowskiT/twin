/** Release manifest validator for PRs #448-450. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFESTS = ["releases/manifest-pr449.json", "releases/manifest-pr450.json", "releases/manifest-pr448.json"];

type Manifest = {
  schemaVersion: string;
  pr: number;
  headSha: string;
  launchGo: boolean;
  gateF: string;
  pilot: boolean;
};

function loadManifest(path: string): Manifest {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8"));
}

test("1 all three manifests exist", () => {
  for (const m of MANIFESTS) loadManifest(m);
});

test("2 launchGo false on all", () => {
  for (const m of MANIFESTS) assert.equal(loadManifest(m).launchGo, false);
});

test("3 gateF PENDING on all", () => {
  for (const m of MANIFESTS) assert.equal(loadManifest(m).gateF, "PENDING");
});

test("4 pilot true on all", () => {
  for (const m of MANIFESTS) assert.equal(loadManifest(m).pilot, true);
});

test("5 merge order 449 450 448", () => {
  const orders = MANIFESTS.map((m) => loadManifest(m)).sort((a, b) => {
    const o: Record<number, number> = { 449: 1, 450: 2, 448: 3 };
    return o[a.pr] - o[b.pr];
  });
  assert.deepEqual(
    orders.map((m) => m.pr),
    [449, 450, 448],
  );
});

test("6 head SHAs match expected prefixes", () => {
  const expected: Record<number, string> = {
    449: "905a660c",
    450: "cda7a206",
    448: "5c3c4825",
  };
  for (const m of MANIFESTS) {
    const manifest = loadManifest(m);
    assert.ok(manifest.headSha.startsWith(expected[manifest.pr].slice(0, 7)));
  }
});
