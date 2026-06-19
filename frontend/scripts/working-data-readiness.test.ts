/**
 * Working data readiness — route, markers, integrations (8 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  WORKING_DATA_READINESS_FORBIDDEN_PATTERNS,
  WORKING_DATA_READINESS_MARKERS,
  WORKING_DATA_READINESS_ROUTE,
  workingDataReadinessHref,
} from "../src/lib/working-data-readiness";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/board/working-data-readiness/page.tsx")));
  assert.equal(workingDataReadinessHref(), WORKING_DATA_READINESS_ROUTE);
});

test("2 workspace renders section markers on inner divs", () => {
  const ws = read("src/components/board/working-data-readiness-workspace.tsx");
  for (const key of ["entities", "demoSources", "persistenceCandidates", "auditPreview", "launch"] as const) {
    assert.match(ws, new RegExp(`WORKING_DATA_READINESS_MARKERS\\.${key}`));
  }
});

test("3 SOR registry includes working_data_readiness", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "working_data_readiness");
  assert.ok(entry);
  assert.equal(entry?.href, WORKING_DATA_READINESS_ROUTE);
});

test("4 founder demo journey includes working data readiness", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /workingDataReadinessHref/);
  assert.match(routes, /id: "working_data_readiness"/);
});

test("5 executive product proof links working data readiness", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /working_data_readiness/);
  assert.match(proof, /\/board\/working-data-readiness/);
});

test("6 i18n EN and PL namespaces exist", () => {
  assert.ok(en.workingDataReadiness.pageTitle);
  assert.ok(dictionaries.pl.workingDataReadiness.pageTitle);
});

test("7 package.json exposes test scripts", () => {
  assert.match(read("package.json"), /test:working-data-readiness/);
});

test("8 docs file exists and no forbidden copy in workspace", () => {
  assert.ok(existsSync(join(root, "..", "docs/WORKING_DATA_READINESS_2026-06-19.md")));
  const ws = read("src/components/board/working-data-readiness-workspace.tsx");
  for (const pattern of WORKING_DATA_READINESS_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(ws, pattern);
  }
});
