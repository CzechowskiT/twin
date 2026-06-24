/**
 * Microsoft busy slot preview panel — render guards and copy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { MICROSOFT_BUSY_READ_MARKERS } from "../src/lib/microsoft-busy-read";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 panel component file exists", () => {
  assert.ok(read("src/components/shared/microsoft-busy-slot-preview-panel.tsx").length > 0);
});

test("2 panel uses slot preview marker", () => {
  const src = read("src/components/shared/microsoft-busy-slot-preview-panel.tsx");
  assert.match(src, /MICROSOFT_BUSY_READ_MARKERS\.slotPreview/);
  assert.match(src, /Calendars\.Read/);
});

test("3 candidate and board workspaces wire slot preview panel", () => {
  const candidate = read("src/components/candidate/candidate-calendar-readiness-workspace.tsx");
  const board = read("src/components/board/board-calendar-readiness-monitor-workspace.tsx");
  assert.match(candidate, /MicrosoftBusySlotPreviewPanel/);
  assert.match(board, /MicrosoftBusySlotPreviewPanel/);
});

test("4 event details redacted copy present", () => {
  const src = read("src/components/shared/microsoft-busy-slot-preview-panel.tsx");
  assert.match(src, /eventDetailsRedacted/);
  assert.match(read("src/lib/microsoft-busy-read-demo-data.ts"), /event_subject_redacted/);
});

test("5 no write invite sync copy in panel", () => {
  const blob = read("src/components/shared/microsoft-busy-slot-preview-panel.tsx");
  assert.doesNotMatch(blob, /calendar synced/i);
  assert.doesNotMatch(blob, /event created/i);
});

test("6 disabled live action visible", () => {
  const src = read("src/components/shared/microsoft-busy-slot-preview-panel.tsx");
  assert.match(src, /disabled/);
  assert.match(src, /MICROSOFT_BUSY_READ_MARKERS\.liveDisabled/);
});

test("7 compact variant wired on recruiter and company cockpits", () => {
  const recruiter = read("src/components/recruiter/recruiter-daily-operating-cockpit-workspace.tsx");
  const company = read("src/components/company/company-hiring-command-center-workspace.tsx");
  assert.match(recruiter, /MicrosoftBusySlotPreviewPanel/);
  assert.match(company, /MicrosoftBusySlotPreviewPanel/);
  assert.match(recruiter, /compact/);
});

test("8 i18n keys in en and pl", () => {
  assert.ok(en.microsoftBusyRead.liveBusyReadDisabled);
  assert.ok(dictionaries.pl.microsoftBusyRead.eventDetailsRedacted);
});

test("9 package.json exposes slot preview panel test", () => {
  assert.match(read("package.json"), /test:microsoft-busy-slot-preview-panel/);
});
