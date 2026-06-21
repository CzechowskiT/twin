/** Placement verification integration — cross-surface link guards. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { OPERATIONAL_CROSS_LINKS } from "../src/lib/operational-cross-links";
import {
  PLACEMENT_VERIFICATION_INTEGRATION_DOC,
  PLACEMENT_VERIFICATION_INTEGRATION_LINKS,
  placementVerificationIntegrationHref,
} from "../src/lib/placement-verification-integration";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 evidence doc exists", () => {
  assert.ok(existsSync(join(root, "..", PLACEMENT_VERIFICATION_INTEGRATION_DOC)));
});

test("2 integration links cover five personas", () => {
  assert.equal(PLACEMENT_VERIFICATION_INTEGRATION_LINKS.length, 5);
  assert.equal(placementVerificationIntegrationHref("board_monitor"), "/board/placement-verification");
});

test("3 trust overview links to candidate placement preview", () => {
  const ws = read("src/components/candidate/candidate-trust-overview-workspace.tsx");
  assert.match(ws, /placementVerificationIntegrationHref\("candidate_preview"\)/);
  assert.match(ws, /candidatePlacementVerification\.pageTitle/);
});

test("4 recruiter cockpit links to recruiter checklist", () => {
  const lib = read("src/lib/recruiter-daily-operating-cockpit.ts");
  assert.match(lib, /\/recruiter\/placement-verification/);
});

test("5 company command center links to company checklist", () => {
  const lib = read("src/lib/company-hiring-command-center.ts");
  assert.match(lib, /\/company\/placement-verification/);
});

test("6 operational cross-links include board placement monitor", () => {
  const hrefs = OPERATIONAL_CROSS_LINKS.map((l) => l.href);
  assert.ok(hrefs.includes("/board/placement-verification"));
});

test("7 investor placement demo links to evidence surfaces", () => {
  const demo = read("src/components/investor/placement-verification-demo.tsx");
  assert.match(demo, /PLACEMENT_VERIFICATION_INTEGRATION_LINKS/);
});

test("8 board surfaces already link placement monitor", () => {
  assert.match(read("src/lib/board-persistence-operations-monitor.ts"), /placement-verification/);
  assert.match(read("src/lib/production-persistence-status.ts"), /placement-verification/);
});

test("9 doc states hard bans and no billing claims", () => {
  const doc = read(`../${PLACEMENT_VERIFICATION_INTEGRATION_DOC}`);
  assert.match(doc, /not legal verification/i);
  assert.match(doc, /no payment initiated/i);
  assert.match(doc, /\*\*Forbidden:\*\*/);
  assert.match(doc, /employer-confirmed/i);
});
