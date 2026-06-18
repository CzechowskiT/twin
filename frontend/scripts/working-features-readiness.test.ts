/**
 * Working features readiness — route, markers, integrations (8 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  WORKING_FEATURES_READINESS_MARKERS,
  WORKING_FEATURES_READINESS_ROUTE,
  workingFeaturesReadinessHref,
} from "../src/lib/working-features-readiness";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/board/working-features-readiness/page.tsx")));
  assert.equal(workingFeaturesReadinessHref(), WORKING_FEATURES_READINESS_ROUTE);
});

test("2 workspace renders section markers", () => {
  const ws = read("src/components/board/working-features-readiness-workspace.tsx");
  for (const key of ["candidateMatrix", "recruiterMatrix", "companyMatrix", "implementation", "launch"] as const) {
    assert.match(ws, new RegExp(`WORKING_FEATURES_READINESS_MARKERS\\.${key}`));
  }
});

test("3 SOR registry includes working_features_readiness", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "working_features_readiness");
  assert.ok(entry);
  assert.equal(entry?.href, WORKING_FEATURES_READINESS_ROUTE);
});

test("4 founder demo journey includes readiness matrix", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /workingFeaturesReadinessHref/);
  assert.match(routes, /id: "working_features_readiness"/);
});

test("5 executive product proof links readiness matrix", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /workingFeaturesReadinessHref/);
});

test("6 i18n EN and PL namespaces exist", () => {
  assert.ok(en.workingFeaturesReadiness.pageTitle);
  assert.ok(dictionaries.pl.workingFeaturesReadiness.pageTitle);
});

test("7 package.json exposes test scripts", () => {
  assert.match(read("package.json"), /test:working-features-readiness/);
});

test("8 docs file exists", () => {
  assert.ok(existsSync(join(root, "..", "docs/WORKING_FEATURES_READINESS_2026-06-18.md")));
});
