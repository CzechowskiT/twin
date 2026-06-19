/**
 * Recruiter operational work queue — route, markers, integrations.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  RECRUITER_OPERATIONAL_WORK_QUEUE_FORBIDDEN_PATTERNS,
  RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS,
  RECRUITER_OPERATIONAL_WORK_QUEUE_ROUTE,
  recruiterOperationalWorkQueueHref,
} from "../src/lib/recruiter-operational-work-queue";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/operational-work-queue/page.tsx")));
  assert.equal(recruiterOperationalWorkQueueHref(), RECRUITER_OPERATIONAL_WORK_QUEUE_ROUTE);
});

test("2 workspace renders section markers on inner divs", () => {
  const ws = read("src/components/recruiter/recruiter-operational-work-queue-workspace.tsx");
  for (const key of ["summary", "activeWorklist", "trustReview", "boundary", "disabledActions"] as const) {
    assert.match(ws, new RegExp(`RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS\\.${key}`));
  }
});

test("3 disabled action buttons present", () => {
  const ws = read("src/components/recruiter/recruiter-operational-work-queue-workspace.tsx");
  assert.match(ws, /recruiter-operational-work-queue-action-\$\{action\.key\}-disabled/);
  assert.match(ws, /RECRUITER_OPERATIONAL_WORK_QUEUE_DISABLED_ACTIONS/);
});

test("4 SOR registry includes recruiter_operational_work_queue", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_operational_work_queue");
  assert.ok(entry);
  assert.equal(entry?.href, RECRUITER_OPERATIONAL_WORK_QUEUE_ROUTE);
});

test("5 i18n EN and PL namespaces exist", () => {
  assert.ok(en.recruiterOperationalWorkQueue.pageTitle);
  assert.ok(dictionaries.pl.recruiterOperationalWorkQueue.pageTitle);
});

test("6 package.json exposes test scripts", () => {
  assert.match(read("package.json"), /test:recruiter-operational-work-queue/);
});

test("7 docs file exists and no forbidden copy", () => {
  assert.ok(existsSync(join(root, "..", "docs/RECRUITER_OPERATIONAL_WORK_QUEUE_2026-06-19.md")));
  const ws = read("src/components/recruiter/recruiter-operational-work-queue-workspace.tsx");
  for (const pattern of RECRUITER_OPERATIONAL_WORK_QUEUE_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(ws, pattern);
  }
});

test("8 links to daily cockpit and trust review queue", () => {
  const lib = read("src/lib/recruiter-operational-work-queue.ts");
  assert.match(lib, /recruiterDailyCockpitHref/);
  assert.match(lib, /recruiterTrustReviewQueueHref/);
});
