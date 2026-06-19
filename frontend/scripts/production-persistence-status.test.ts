/**
 * Production persistence status — static + browser smoke (workers=1).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  PRODUCTION_PERSISTENCE_STATUS_FORBIDDEN_PATTERNS,
  PRODUCTION_PERSISTENCE_STATUS_MARKERS,
  PRODUCTION_PERSISTENCE_STATUS_ROUTE,
  productionPersistenceStatusHref,
} from "../src/lib/production-persistence-status";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/board/production-persistence-status/page.tsx")));
  assert.equal(productionPersistenceStatusHref(), PRODUCTION_PERSISTENCE_STATUS_ROUTE);
});

test("2 workspace renders nine section markers", () => {
  const ws = read("src/components/board/production-persistence-status-workspace.tsx");
  for (const key of [
    "healthSummary",
    "commitInterpretation",
    "migrationChecklist",
    "authSmokeReadiness",
    "endpointMatrix",
    "limitations",
    "nextAction",
    "launch",
  ] as const) {
    assert.match(ws, new RegExp(`PRODUCTION_PERSISTENCE_STATUS_MARKERS\\.${key}`));
  }
});

test("3 i18n EN and PL namespaces exist", () => {
  assert.ok(en.productionPersistenceStatus.pageTitle);
  assert.ok(dictionaries.pl.productionPersistenceStatus.pageTitle);
});

test("4 package.json exposes test scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:production-persistence-status/);
  assert.match(pkg, /test:prod-authenticated-persistence-smoke/);
});

test("5 docs exist", () => {
  const docsRoot = join(root, "..", "docs");
  assert.ok(existsSync(join(docsRoot, "PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md")));
  assert.ok(existsSync(join(docsRoot, "ALEMBIC_PROD_HEAD_VERIFICATION_2026-06-19.md")));
  assert.ok(existsSync(join(docsRoot, "AUTHENTICATED_PROD_PERSISTENCE_SMOKE_2026-06-19.md")));
});

test("6 no forbidden copy in workspace", () => {
  const ws = read("src/components/board/production-persistence-status-workspace.tsx");
  for (const pattern of PRODUCTION_PERSISTENCE_STATUS_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(ws, pattern);
  }
});

test("7 page marker constant", () => {
  assert.equal(PRODUCTION_PERSISTENCE_STATUS_MARKERS.page, "production-persistence-status-page");
});
