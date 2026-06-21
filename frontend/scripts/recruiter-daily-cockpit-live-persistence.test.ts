/** Recruiter daily cockpit live persistence summary — static guards. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { RECRUITER_DAILY_COCKPIT_MARKERS } from "../src/lib/recruiter-daily-operating-cockpit";
import { LIVE_OPERATING_STATE_MARKERS, loadRecruiterOperatingState } from "../src/lib/live-operating-state";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 live-operating-state module uses fetchSafePersistenceList", () => {
  const lib = read("src/lib/live-operating-state.ts");
  assert.match(lib, /fetchSafePersistenceList/);
  assert.match(lib, /work-items/);
  assert.match(lib, /review-queue/);
  assert.match(lib, /request-intake/);
  assert.match(lib, /candidate-role-status/);
  assert.match(lib, /company-feedback/);
  assert.match(lib, /AUDIT_EVENT_API_PATH/);
});

test("2 daily cockpit workspace wires operating state panel", () => {
  const ws = read("src/components/recruiter/recruiter-daily-operating-cockpit-workspace.tsx");
  assert.match(ws, /loadRecruiterOperatingState/);
  assert.match(ws, /LiveOperatingStatePanel/);
  assert.match(ws, /RECRUITER_DAILY_COCKPIT_MARKERS\.operatingState/);
});

test("3 operating state markers exported", () => {
  assert.equal(RECRUITER_DAILY_COCKPIT_MARKERS.operatingState, "recruiter-daily-cockpit-operating-state");
  assert.equal(LIVE_OPERATING_STATE_MARKERS.sourceBadge, "live-operating-state-source-badge");
});

test("4 i18n keys exist EN and PL", () => {
  assert.ok(en.recruiterDailyCockpit.operatingStateTitle.length > 3);
  assert.ok(en.liveOperatingState.partialFallback.includes("Partial"));
  assert.ok(dictionaries.pl.recruiterDailyCockpit.operatingStateTitle.length > 3);
  assert.ok(dictionaries.pl.liveOperatingState.partialFallback.includes("Częściowo"));
});

test("5 all locales expose liveOperatingState namespace", () => {
  for (const locale of LOCALES) {
    const section = dictionaries[locale].liveOperatingState;
    assert.ok(section.channelWorkItems.length > 1, locale);
    assert.ok(section.monitorTitle.length > 3, locale);
  }
});

test("6 loadRecruiterOperatingState returns channel shape", async () => {
  const summary = await loadRecruiterOperatingState();
  assert.ok(["live", "demo", "partial"].includes(summary.aggregateSource));
  assert.equal(summary.channels.length, 6);
  for (const ch of summary.channels) {
    assert.ok(ch.count >= 0);
    assert.ok(ch.href.startsWith("/"));
  }
});

test("7 no forbidden saved copy in workspace", () => {
  const ws = read("src/components/recruiter/recruiter-daily-operating-cockpit-workspace.tsx");
  assert.doesNotMatch(ws, /saved successfully/i);
  assert.doesNotMatch(ws, /email sent/i);
});
