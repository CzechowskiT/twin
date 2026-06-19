import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { EXPORT_REQUESTS_API_PATH } from "../src/lib/export-requests";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "..");

test("1 router", () => {
  assert.match(readFileSync(join(repo, "backend/app/api/router.py"), "utf8"), /export_requests/);
  assert.equal(EXPORT_REQUESTS_API_PATH, "/api/v1/export-requests");
});
test("2 no patch delete", () => {
  const api = readFileSync(join(repo, "backend/app/api/export_requests.py"), "utf8");
  assert.doesNotMatch(api, /@router\.(patch|delete)/);
});
test("3 forbidden statuses rejected", () => assert.match(readFileSync(join(repo, "backend/app/services/export_requests.py"), "utf8"), /FORBIDDEN_STATUSES/));
test("4 UI route", () => assert.ok(existsSync(join(root, "src/app/dashboard/trust/export-requests/page.tsx"))));
test("5 export preview note", () => assert.match(readFileSync(join(root, "src/components/candidate/candidate-export-preview-workspace.tsx"), "utf8"), /ExportRequestPersistenceNote/));
test("6 audit export note", () => assert.match(readFileSync(join(root, "src/components/candidate/candidate-trust-audit-export-workspace.tsx"), "utf8"), /ExportRequestPersistenceNote/));
test("7 consent receipt note", () => assert.match(readFileSync(join(root, "src/components/candidate/candidate-consent-receipt-workspace.tsx"), "utf8"), /ExportRequestPersistenceNote/));
test("8 docs", () => assert.ok(existsSync(join(repo, "docs/EXPORT_REQUESTS_2026-06-19.md"))));
