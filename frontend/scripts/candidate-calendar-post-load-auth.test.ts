/**
 * Regression: calendar post-load integration errors must not clear TWIN session.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import {
  isCalendarIntegrationFailure,
  shouldClearSessionOnApiError,
} from "../src/lib/api";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("calendar provider token expiry is not an app auth failure", () => {
  assert.equal(
    isCalendarIntegrationFailure(
      401,
      "Calendar token expired or revoked; reconnect Google Calendar.",
      "/api/v1/calendar/google/events",
    ),
    true,
  );
  assert.equal(
    isCalendarIntegrationFailure(
      401,
      "Microsoft token expired or revoked; reconnect Microsoft Calendar.",
      "/api/v1/calendar/microsoft/freebusy",
    ),
    true,
  );
  assert.equal(
    isCalendarIntegrationFailure(400, "Google Calendar is not connected", "/api/v1/calendar/google/events"),
    true,
  );
});

test("invalid TWIN session still clears on app auth errors", () => {
  assert.equal(shouldClearSessionOnApiError(401, "Invalid token", "/api/v1/auth/me"), true);
  assert.equal(shouldClearSessionOnApiError(401, "Inactive user", "/api/v1/calendar/me/interviews"), true);
  assert.equal(
    shouldClearSessionOnApiError(
      401,
      "Calendar token expired or revoked; reconnect Google Calendar.",
      "/api/v1/calendar/google/events",
    ),
    false,
  );
});

test("preserveSessionOnUnauthorized opts out of session clear", () => {
  assert.equal(
    shouldClearSessionOnApiError(401, "Invalid token", "/api/v1/auth/me", {
      preserveSessionOnUnauthorized: true,
    }),
    false,
  );
});

test("calendar page shows disconnected copy and does not clear token", () => {
  const page = read("src/app/dashboard/calendar/page.tsx");
  assert.doesNotMatch(page, /clearToken\(\)/);
  assert.match(page, /calendarPageLeadDisconnected/);
  assert.match(page, /calendarConnectHeroTitle/);
  assert.match(page, /\/api\/v1\/calendar\/me\/interviews/);
  assert.match(page, /preserveSessionOnUnauthorized:\s*true/);
});

test("api layer exports calendar integration guard", () => {
  const api = read("src/lib/api.ts");
  assert.match(api, /isCalendarIntegrationFailure/);
  assert.match(api, /shouldClearSessionOnApiError/);
  assert.doesNotMatch(
    api,
    /handleAuthFailure\([\s\S]*?\)\s*\{[\s\S]*?clearToken\(\)[\s\S]*?isCalendarIntegrationFailure/,
    "session clear must be gated before clearToken",
  );
});
