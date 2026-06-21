/** Operational queue cross-linking — static guards. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { OPERATIONAL_CROSS_LINKS } from "../src/lib/operational-cross-links";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SURFACES = [
  "src/components/recruiter/recruiter-operational-work-queue-workspace.tsx",
  "src/components/recruiter/recruiter-daily-operating-cockpit-workspace.tsx",
  "src/components/company/company-hiring-command-center-workspace.tsx",
  "src/components/board/board-persistence-operations-monitor-workspace.tsx",
] as const;

test("1 cross-links panel on operational surfaces", () => {
  for (const rel of SURFACES) {
    assert.match(readFileSync(join(root, rel), "utf8"), /OperationalCrossLinksPanel/, rel);
  }
});

test("2 cross-links include key routes", () => {
  const hrefs = OPERATIONAL_CROSS_LINKS.map((l) => l.href);
  assert.ok(hrefs.includes("/recruiter/daily-cockpit"));
  assert.ok(hrefs.includes("/board/persistence-operations-monitor"));
});
