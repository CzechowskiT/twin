/** Board calendar readiness monitor — static guards. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  BOARD_CALENDAR_READINESS_MONITOR_MARKERS,
  BOARD_CALENDAR_READINESS_MONITOR_ROUTE,
  resolveBoardCalendarReadinessMonitor,
} from "../src/lib/board-calendar-readiness-monitor";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_COPY = [/calendar synced/i, /event created/i, /invite sent/i] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/board/calendar-readiness/page.tsx")));
  assert.equal(BOARD_CALENDAR_READINESS_MONITOR_ROUTE, "/board/calendar-readiness");
});

test("2 workspace renders all section markers", () => {
  const ws = read("src/components/board/board-calendar-readiness-monitor-workspace.tsx");
  assert.match(ws, /BOARD_CALENDAR_READINESS_MONITOR_MARKERS\.providerMatrix/);
  assert.match(ws, /BOARD_CALENDAR_READINESS_MONITOR_MARKERS\.publicHealth/);
  assert.match(ws, /BOARD_CALENDAR_READINESS_MONITOR_MARKERS\.blockedCapabilities/);
  assert.match(ws, /BOARD_CALENDAR_READINESS_MONITOR_MARKERS\.personaRoutes/);
  assert.match(ws, /BOARD_CALENDAR_READINESS_MONITOR_MARKERS\.launch/);
  assert.match(ws, /OperationalCrossLinksPanel/);
  assert.match(ws, /MicrosoftCalendarReadinessBusyReadPanel/);
  assert.match(ws, /MicrosoftBusySlotPreviewPanel/);
  assert.match(ws, /MicrosoftOAuthConnectUiGate/);
  assert.match(ws, /MicrosoftBusyReadCrossLinkCard/);
  assert.match(ws, /resolveMicrosoftBusyRead/);
  assert.match(ws, /resolveMicrosoftCalendarReadiness/);
});

test("3 demo record has providers and persona routes", () => {
  const record = resolveBoardCalendarReadinessMonitor();
  assert.equal(record.providers.length, 4);
  assert.ok(record.persona_routes.length >= 4);
  assert.ok(record.blocked_capabilities.length >= 5);
});

test("4 persistence monitor links to calendar readiness", () => {
  const lib = read("src/lib/board-persistence-operations-monitor.ts");
  assert.match(lib, /calendar-readiness/);
});

test("5 i18n boardCalendarReadiness keys in en and pl", () => {
  assert.ok(en.boardCalendarReadiness.pageTitle);
  assert.ok(dictionaries.pl.boardCalendarReadiness.pageTitle);
});

test("6 no forbidden commercial claims in demo data or i18n", () => {
  const blob =
    read("src/lib/board-calendar-readiness-monitor-demo-data.ts") +
    JSON.stringify(en.boardCalendarReadiness) +
    JSON.stringify(dictionaries.pl.boardCalendarReadiness);
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});

test("7 package.json exposes board calendar readiness monitor test", () => {
  assert.match(read("package.json"), /test:board-calendar-readiness-monitor/);
});

test("8 operational cross links include calendar readiness", () => {
  const lib = read("src/lib/operational-cross-links.ts");
  assert.match(lib, /calendar-readiness/);
});
