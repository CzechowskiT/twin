/** Data quality checker guard — admin route + doc contract. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = join(repoRoot, "docs/DATA_QUALITY_CHECKER_2026-07-13.md");
const ADMIN_ROUTE = join(repoRoot, "backend/app/api/admin_ops.py");
const FE_PAGE = join(repoRoot, "frontend/src/app/admin/data-quality/page.tsx");

test("1 data quality doc exists", () => {
  assert.match(readFileSync(DOC, "utf8"), /data quality/i);
});

test("2 admin API route wired", () => {
  assert.match(readFileSync(ADMIN_ROUTE, "utf8"), /data-quality/);
});

test("3 frontend admin page exists", () => {
  assert.ok(existsSync(FE_PAGE));
});

test("4 NO-GO stance in doc", () => {
  assert.match(readFileSync(DOC, "utf8"), /NO-GO|PILOT/);
});

test("5 no secrets in doc", () => {
  const doc = readFileSync(DOC, "utf8");
  assert.doesNotMatch(doc, /password\s*=\s*\S+/i);
});
