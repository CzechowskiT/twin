/** Board Microsoft busy-read staging checklist — static guards. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_FORBIDDEN_PATTERNS,
  BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS,
  BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_ROUTE,
  boardMicrosoftBusyReadStagingChecklistHref,
  resolveBoardMicrosoftBusyReadStagingChecklist,
} from "../src/lib/board-microsoft-busy-read-staging-checklist";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/board/microsoft-busy-read-staging-checklist/page.tsx")));
  assert.equal(boardMicrosoftBusyReadStagingChecklistHref(), BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_ROUTE);
});

test("2 workspace renders section markers", () => {
  const ws = read("src/components/board/board-microsoft-busy-read-staging-checklist-workspace.tsx");
  assert.match(ws, /BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS\.prodGates/);
  assert.match(ws, /BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS\.smokeCommands/);
  assert.match(ws, /BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS\.uiExpectations/);
  assert.match(ws, /BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS\.hardBans/);
  assert.match(ws, /BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS\.launch/);
  assert.match(ws, /MicrosoftBusyReadStagingStatusBanner/);
  assert.match(ws, /OperationalCrossLinksPanel/);
});

test("3 demo record has gates, smoke commands, and UI expectations", () => {
  const record = resolveBoardMicrosoftBusyReadStagingChecklist();
  assert.equal(record.prodGatesOff.length, 4);
  assert.equal(record.smokeCommands.length, 3);
  assert.ok(record.smokeCommands.some((row) => row.command.includes("TWIN_BUSY_READ_SMOKE_DRY_RUN=1")));
  assert.ok(record.smokeCommands.some((row) => row.command.includes("TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1")));
  assert.equal(record.uiExpectations.length, 4);
  assert.equal(record.hardBans.length, 4);
});

test("4 calendar readiness links to busy-read checklist", () => {
  const lib = read("src/lib/board-calendar-readiness-monitor.ts");
  assert.match(lib, /microsoft-busy-read-staging-checklist/);
});

test("5 i18n boardMicrosoftBusyReadStagingChecklist keys in en and pl", () => {
  assert.ok(en.boardMicrosoftBusyReadStagingChecklist.pageTitle);
  assert.ok(dictionaries.pl.boardMicrosoftBusyReadStagingChecklist.pageTitle);
});

test("6 no forbidden copy in workspace or demo data", () => {
  const blob =
    read("src/components/board/board-microsoft-busy-read-staging-checklist-workspace.tsx") +
    read("src/lib/board-microsoft-busy-read-staging-checklist-demo-data.ts") +
    JSON.stringify(en.boardMicrosoftBusyReadStagingChecklist);
  for (const pattern of BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});

test("7 package.json exposes board microsoft busy-read staging checklist test", () => {
  assert.match(read("package.json"), /test:board-microsoft-busy-read-staging-checklist/);
});

test("8 smoke commands never embed JWT placeholder in forbidden patterns", () => {
  const record = resolveBoardMicrosoftBusyReadStagingChecklist();
  for (const row of record.smokeCommands) {
    assert.doesNotMatch(row.command, /Bearer /);
    assert.doesNotMatch(row.command, /eyJ/);
  }
});
