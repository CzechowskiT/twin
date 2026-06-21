/** Company command center live persistence — static guards. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { COMPANY_HIRING_COMMAND_CENTER_MARKERS } from "../src/lib/company-hiring-command-center";
import { loadCompanyOperatingState } from "../src/lib/live-operating-state";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 company command center wires loadCompanyOperatingState", () => {
  const ws = read("src/components/company/company-hiring-command-center-workspace.tsx");
  assert.match(ws, /loadCompanyOperatingState/);
  assert.match(ws, /LiveOperatingStatePanel/);
});

test("2 operating state markers exported", () => {
  assert.equal(COMPANY_HIRING_COMMAND_CENTER_MARKERS.operatingState, "company-hiring-command-center-operating-state");
});

test("3 i18n keys EN PL", () => {
  assert.ok(en.companyHiringCommandCenter.operatingStateTitle.length > 3);
  assert.ok(dictionaries.pl.companyHiringCommandCenter.operatingStateLead.length > 3);
});

test("4 loadCompanyOperatingState returns 4 channels", async () => {
  const summary = await loadCompanyOperatingState();
  assert.equal(summary.channels.length, 4);
});
