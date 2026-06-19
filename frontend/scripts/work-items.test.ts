import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  WORK_ITEMS_API_PATH,
  WORK_ITEMS_COMPANY_ROUTE,
  WORK_ITEMS_FORBIDDEN_PATTERNS,
  WORK_ITEMS_MARKERS,
  WORK_ITEMS_RECRUITER_ROUTE,
} from "../src/lib/work-items";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 GET route registered in backend", () => {
  const router = readFileSync(join(repoRoot, "backend/app/api/router.py"), "utf8");
  assert.match(router, /work_items/);
  assert.equal(WORK_ITEMS_API_PATH, "/api/v1/work-items");
});

test("2 recruiter UI route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/work-items/page.tsx")));
});

test("3 workspace section markers", () => {
  const ws = read("src/components/recruiter/work-items-workspace.tsx");
  for (const key of ["header", "list", "createForm", "statusPreview", "auditTrail", "boundary"] as const) {
    assert.match(ws, new RegExp(`WORK_ITEMS_MARKERS\\.${key}`));
  }
});

test("4 company mirror route exists", () => {
  assert.ok(existsSync(join(root, "src/app/company/work-items/page.tsx")));
  assert.equal(WORK_ITEMS_COMPANY_ROUTE, "/company/work-items");
});

test("5 no delete in API module", () => {
  const api = readFileSync(join(repoRoot, "backend/app/api/work_items.py"), "utf8");
  assert.doesNotMatch(api, /@router\.delete/);
});

test("6 audit integration in service", () => {
  const svc = readFileSync(join(repoRoot, "backend/app/services/work_items.py"), "utf8");
  assert.match(svc, /create_audit_event/);
});

test("7 forbidden copy absent from workspace", () => {
  const ws = read("src/components/recruiter/work-items-workspace.tsx");
  for (const p of WORK_ITEMS_FORBIDDEN_PATTERNS) assert.doesNotMatch(ws, p);
});

test("8 disabled outbound actions listed", () => {
  const demo = read("src/lib/work-items-demo-data.ts");
  assert.match(demo, /disabledEmail/);
  assert.match(demo, /disabledSchedule/);
  assert.match(demo, /disabledAts/);
});

test("9 i18n namespaces", () => {
  assert.ok(en.workItems.recruiterTitle);
  assert.ok(dictionaries.pl.workItems.recruiterTitle);
});

test("10 docs exist", () => {
  assert.ok(existsSync(join(repoRoot, "docs/WORK_ITEMS_PERSISTENCE_2026-06-18.md")));
});

test("11 recruiter route constant", () => {
  assert.equal(WORK_ITEMS_RECRUITER_ROUTE, "/recruiter/work-items");
  assert.match(read("package.json"), /test:work-items/);
});
