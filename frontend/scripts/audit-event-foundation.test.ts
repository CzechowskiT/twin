/**
 * Audit event foundation — route, API contract, docs (11 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  AUDIT_EVENT_API_PATH,
  AUDIT_EVENT_FOUNDATION_FORBIDDEN_PATTERNS,
  AUDIT_EVENT_FOUNDATION_MARKERS,
  AUDIT_EVENT_FOUNDATION_ROUTE,
  auditEventFoundationHref,
} from "../src/lib/audit-event-foundation";
import { getAuditEventFoundationDemo } from "../src/lib/audit-event-foundation-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/board/audit-event-foundation/page.tsx")));
  assert.equal(auditEventFoundationHref(), AUDIT_EVENT_FOUNDATION_ROUTE);
});

test("2 workspace renders section markers", () => {
  const ws = read("src/components/board/audit-event-foundation-workspace.tsx");
  for (const key of ["header", "contract", "samples", "boundaries", "apiPreview", "launchStatus"] as const) {
    assert.match(ws, new RegExp(`AUDIT_EVENT_FOUNDATION_MARKERS\\.${key}`));
  }
});

test("3 demo samples have external_side_effect false", () => {
  const demo = getAuditEventFoundationDemo();
  assert.ok(demo.sample_events.length >= 2);
  assert.ok(demo.sample_events.every((e) => e.external_side_effect === false));
});

test("4 SOR registry includes audit_event_foundation", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "audit_event_foundation");
  assert.ok(entry);
  assert.equal(entry?.href, AUDIT_EVENT_FOUNDATION_ROUTE);
});

test("5 founder demo journey includes audit event foundation", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /auditEventFoundationHref/);
  assert.match(routes, /id: "audit_event_foundation"/);
});

test("6 executive product proof links audit event foundation", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /audit_event_foundation/);
  assert.match(proof, /\/board\/audit-event-foundation/);
});

test("7 i18n EN and PL namespaces exist", () => {
  assert.ok(en.auditEventFoundation.pageTitle);
  assert.ok(dictionaries.pl.auditEventFoundation.pageTitle);
  assert.match(en.auditEventFoundation.pilotBadge, /NO EXTERNAL SIDE EFFECT/i);
});

test("8 package.json exposes test script", () => {
  assert.match(read("package.json"), /test:audit-event-foundation/);
});

test("9 docs file exists and no forbidden copy", () => {
  assert.ok(existsSync(join(repoRoot, "docs/AUDIT_EVENT_FOUNDATION_2026-06-18.md")));
  const ws = read("src/components/board/audit-event-foundation-workspace.tsx");
  for (const pattern of AUDIT_EVENT_FOUNDATION_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(ws, pattern);
  }
});

test("10 backend router registers audit-events API", () => {
  const router = readFileSync(join(repoRoot, "backend/app/api/router.py"), "utf8");
  assert.match(router, /audit_events/);
  assert.match(router, /\/audit-events/);
});

test("11 API path constant matches backend prefix", () => {
  assert.equal(AUDIT_EVENT_API_PATH, "/api/v1/audit-events");
  const demo = getAuditEventFoundationDemo();
  assert.deepEqual(demo.allowed_methods, ["GET", "POST"]);
});
