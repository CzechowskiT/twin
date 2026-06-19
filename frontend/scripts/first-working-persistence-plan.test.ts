/**
 * First working persistence plan — route, markers, backend sequence, no backend routes.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  FIRST_WORKING_PERSISTENCE_PLAN_FORBIDDEN_PATTERNS,
  FIRST_WORKING_PERSISTENCE_PLAN_MARKERS,
  FIRST_WORKING_PERSISTENCE_PLAN_ROUTE,
  firstWorkingPersistencePlanHref,
} from "../src/lib/first-working-persistence-plan";
import { getFirstWorkingPersistencePlanDemo } from "../src/lib/first-working-persistence-plan-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function walkBackendFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkBackendFiles(full, acc);
    else if (entry.name.endsWith(".py")) acc.push(full);
  }
  return acc;
}

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/board/first-working-persistence-plan/page.tsx")));
  assert.equal(firstWorkingPersistencePlanHref(), FIRST_WORKING_PERSISTENCE_PLAN_ROUTE);
});

test("2 workspace renders 10 section markers on inner divs", () => {
  const ws = read("src/components/board/first-working-persistence-plan-workspace.tsx");
  for (const key of [
    "header",
    "backendSequence",
    "entityTargets",
    "scopeBoundaries",
    "deferredActions",
    "migrationGates",
    "dependencyOrder",
    "verificationChecklist",
    "noBackendWrites",
    "launchStatus",
  ] as const) {
    assert.match(ws, new RegExp(`FIRST_WORKING_PERSISTENCE_PLAN_MARKERS\\.${key}`));
  }
  assert.doesNotMatch(ws, /<Card[^>]*data-testid/);
});

test("3 backend sequence includes steps 1-10", () => {
  const demo = getFirstWorkingPersistencePlanDemo();
  assert.equal(demo.backend_sequence.length, 10);
  const steps = demo.backend_sequence.map((s) => s.step).sort((a, b) => a - b);
  assert.deepEqual(steps, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("4 SOR registry includes first_working_persistence_plan", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "first_working_persistence_plan");
  assert.ok(entry);
  assert.equal(entry?.href, FIRST_WORKING_PERSISTENCE_PLAN_ROUTE);
});

test("5 founder demo journey includes persistence plan", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /firstWorkingPersistencePlanHref/);
  assert.match(routes, /id: "first_working_persistence_plan"/);
});

test("6 executive product proof links persistence plan", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /first_working_persistence_plan/);
  assert.match(proof, /\/board\/first-working-persistence-plan/);
});

test("7 i18n EN and PL namespaces exist", () => {
  assert.ok(en.firstWorkingPersistencePlan.pageTitle);
  assert.ok(dictionaries.pl.firstWorkingPersistencePlan.pageTitle);
  assert.match(en.firstWorkingPersistencePlan.launchNoGo, /NO-GO/);
});

test("8 package.json exposes test script", () => {
  assert.match(read("package.json"), /test:first-working-persistence-plan/);
});

test("9 docs file exists and no forbidden copy", () => {
  assert.ok(existsSync(join(repoRoot, "docs/FIRST_WORKING_PERSISTENCE_PLAN_2026-06-19.md")));
  const ws = read("src/components/board/first-working-persistence-plan-workspace.tsx");
  for (const pattern of FIRST_WORKING_PERSISTENCE_PLAN_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(ws, pattern);
  }
});

test("10 launch status includes P0 OPEN and Phase 3B BLOCKED", () => {
  const ws = read("src/components/board/first-working-persistence-plan-workspace.tsx");
  assert.match(ws, /launchNoGo/);
  assert.match(ws, /p0Open/);
  assert.match(ws, /phase3bBlocked/);
});

test("11 no accidental backend routes for persistence plan", () => {
  const router = readFileSync(join(repoRoot, "backend/app/api/router.py"), "utf8");
  assert.doesNotMatch(router, /first.working.persistence/i);
  assert.doesNotMatch(router, /persistence.plan/i);
  const backendFiles = walkBackendFiles(join(repoRoot, "backend"));
  const hits = backendFiles.filter((f) => /persistence.plan|first_working_persistence/i.test(f));
  assert.equal(hits.length, 0, `unexpected backend files: ${hits.join(", ")}`);
  const frontendLib = read("src/lib/first-working-persistence-plan.ts");
  assert.doesNotMatch(frontendLib, /fetch\s*\(/);
  assert.doesNotMatch(frontendLib, /POST|PUT|PATCH|DELETE/);
});
