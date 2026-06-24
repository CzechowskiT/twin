/**
 * Microsoft busy-read API wiring — merge readiness + preview, demo fallback paths.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  mergeMicrosoftBusyReadApi,
  MICROSOFT_BUSY_READ_PREVIEW_PATH,
  MICROSOFT_BUSY_READ_READINESS_PATH,
} from "../src/lib/microsoft-busy-read-api";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 api paths match backend routes", () => {
  assert.equal(MICROSOFT_BUSY_READ_READINESS_PATH, "/api/v1/calendar/microsoft/busy-read/readiness");
  assert.equal(MICROSOFT_BUSY_READ_PREVIEW_PATH, "/api/v1/calendar/microsoft/busy-read/preview");
});

test("2 merge maps preview slots with redaction", () => {
  const record = mergeMicrosoftBusyReadApi(
    {
      provider: "microsoft",
      capability: "busy_read",
      oauth_connection_state: "connect_available",
      required_scopes: ["Calendars.Read"],
      forbidden_scopes: ["Calendars.ReadWrite"],
      busy_read_status: "demo_busy_slots_available",
      blocked_capabilities: [],
      public_health_microsoft_configured: false,
      product_gate_enabled: false,
      oauth_connect_gate_enabled: false,
      source: "demo",
      headline: "headline",
    },
    {
      provider: "microsoft",
      capability: "busy_read",
      preview_mode: "demo",
      busy_slot_preview: [
        {
          start: "2026-06-24T09:00:00+02:00",
          end: "2026-06-24T10:00:00+02:00",
          status: "busy",
          source: "demo",
          event_subject_redacted: true,
        },
      ],
      source: "demo",
      headline: "headline",
    },
    "demo-candidate-001",
  );
  assert.equal(record.busy_slot_preview[0]?.event_subject_redacted, true);
  assert.equal(record.candidate_id, "demo-candidate-001");
});

test("3 workspaces wire useMicrosoftBusyReadLive hook", () => {
  const paths = [
    "src/components/candidate/candidate-calendar-readiness-workspace.tsx",
    "src/components/board/board-calendar-readiness-monitor-workspace.tsx",
    "src/components/recruiter/recruiter-daily-operating-cockpit-workspace.tsx",
    "src/components/company/company-hiring-command-center-workspace.tsx",
  ];
  for (const path of paths) {
    assert.match(read(path), /useMicrosoftBusyReadLive/);
  }
});

test("4 api module uses preserveSessionOnUnauthorized", () => {
  assert.match(read("src/lib/microsoft-busy-read-api.ts"), /preserveSessionOnUnauthorized:\s*true/);
});

test("5 hook falls back without token path in source", () => {
  assert.match(read("src/lib/use-microsoft-busy-read-live.ts"), /getToken\(\)/);
  assert.match(read("src/lib/use-microsoft-busy-read-live.ts"), /resolveMicrosoftBusyReadWithFallback/);
});
