/**
 * Recruiter trust review queue — route, demo data, integrations (15 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { getRecruiterTrustReviewQueueDemo } from "../src/lib/recruiter-trust-review-queue-demo-data";
import {
  RECRUITER_TRUST_REVIEW_QUEUE_MARKERS,
  RECRUITER_TRUST_REVIEW_QUEUE_PAGE_MARKER,
  RECRUITER_TRUST_REVIEW_QUEUE_ROUTE,
  recruiterTrustReviewQueueHref,
  resolveRecruiterTrustReviewQueue,
} from "../src/lib/recruiter-trust-review-queue";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { resolveRecruiterTrustReviewQueue as resolveKernelQueue } from "../src/lib/system-of-record-domain";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const WS = "src/components/recruiter/recruiter-trust-review-queue-workspace.tsx";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 trust-review-queue route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/trust-review-queue/page.tsx")));
});

test("2 route constant resolves to /recruiter/trust-review-queue", () => {
  assert.equal(RECRUITER_TRUST_REVIEW_QUEUE_ROUTE, "/recruiter/trust-review-queue");
  assert.equal(recruiterTrustReviewQueueHref(), "/recruiter/trust-review-queue");
});

test("3 demo queue has six items for demo-candidate-001", () => {
  const record = resolveRecruiterTrustReviewQueue();
  assert.equal(record.candidate_id, "demo-candidate-001");
  assert.equal(getRecruiterTrustReviewQueueDemo().queue_items.length, 6);
});

test("4 workspace renders section markers", () => {
  const ws = read(WS);
  assert.match(ws, new RegExp(RECRUITER_TRUST_REVIEW_QUEUE_PAGE_MARKER));
  for (const key of ["header", "summary", "table", "priority", "evidence", "suggested", "boundary", "linkedModules"] as const) {
    assert.match(ws, new RegExp(`RECRUITER_TRUST_REVIEW_QUEUE_MARKERS\\.${key}`));
  }
});

test("5 SOR registry includes recruiter_trust_review_queue", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_trust_review_queue");
  assert.ok(entry);
  assert.equal(entry?.href, RECRUITER_TRUST_REVIEW_QUEUE_ROUTE);
});

test("6 kernel resolver returns demo queue", () => {
  assert.equal(resolveKernelQueue().queue_items.length, 6);
});

test("7 founder demo journey includes trust review queue", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /recruiterTrustReviewQueueHref/);
  assert.match(routes, /id: "recruiter_trust_review_queue"/);
});

test("8 executive product proof links trust review queue", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /recruiterTrustReviewQueueHref/);
});

test("9 daily cockpit module links include trust review queue", () => {
  const lib = read("src/lib/recruiter-daily-operating-cockpit.ts");
  assert.match(lib, /\/recruiter\/trust-review-queue/);
});

test("10 recruiter hub promo links trust review queue", () => {
  const hub = read("src/app/recruiter/page.tsx");
  assert.match(hub, /RECRUITER_TRUST_REVIEW_QUEUE_MARKERS\.hubPromo/);
});

test("11 workspace modules register trust review queue", () => {
  const mod = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "trust_review_queue");
  assert.ok(mod);
  assert.equal(mod?.href, RECRUITER_TRUST_REVIEW_QUEUE_ROUTE);
});

test("12 nav exposes trust review queue", () => {
  const nav = read("src/components/recruiter/recruiter-workspace-nav.tsx");
  assert.match(nav, /\/recruiter\/trust-review-queue/);
});

test("13 i18n EN and PL namespaces exist", () => {
  assert.ok(en.recruiterTrustReviewQueue.pageTitle);
  assert.ok(dictionaries.pl.recruiterTrustReviewQueue.pageTitle);
  assert.ok(en.recruiterTrustReviewQueue.openTrustReviewQueue);
});

test("14 package.json exposes test scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:recruiter-trust-review-queue/);
});

test("15 docs file exists", () => {
  assert.ok(existsSync(join(root, "..", "docs/RECRUITER_TRUST_REVIEW_QUEUE_2026-06-18.md")));
});
