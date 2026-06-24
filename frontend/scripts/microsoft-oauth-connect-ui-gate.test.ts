/**
 * Microsoft OAuth connect UI gate — disabled/no-op connect, scope evidence.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  MICROSOFT_BUSY_READ_FORBIDDEN_SCOPES,
  MICROSOFT_BUSY_READ_REQUIRED_SCOPES,
} from "../src/lib/microsoft-busy-read-demo-data";
import {
  MICROSOFT_BUSY_READ_MARKERS,
  MICROSOFT_OAUTH_CONNECT_GATE_ENABLED,
  microsoftBusyReadConnectDisabled,
} from "../src/lib/microsoft-busy-read";
import { MICROSOFT_BUSY_READ_ENABLED } from "../src/lib/features";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_COPY = [/token stored/i, /invite sent/i, /calendar synced/i, /event created/i] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 oauth gate component exists", () => {
  assert.ok(read("src/components/shared/microsoft-oauth-connect-ui-gate.tsx").length > 0);
});

test("2 oauth configured evidence visible", () => {
  const src = read("src/components/shared/microsoft-oauth-connect-ui-gate.tsx");
  assert.match(src, /public_health_microsoft_configured/);
  assert.match(src, /public-health/);
});

test("3 required and forbidden scopes visible", () => {
  const src = read("src/components/shared/microsoft-oauth-connect-ui-gate.tsx");
  assert.match(src, /required_scopes/);
  assert.match(src, /forbidden_scopes/);
  assert.ok(MICROSOFT_BUSY_READ_REQUIRED_SCOPES.includes("Calendars.Read"));
  assert.ok(MICROSOFT_BUSY_READ_FORBIDDEN_SCOPES.includes("Calendars.ReadWrite"));
});

test("4 connect action disabled no-op", () => {
  assert.equal(MICROSOFT_OAUTH_CONNECT_GATE_ENABLED, false);
  assert.equal(microsoftBusyReadConnectDisabled(), true);
  const src = read("src/components/shared/microsoft-oauth-connect-ui-gate.tsx");
  assert.match(src, /disabled/);
  assert.match(src, /connectDisabledLabel/);
});

test("5 no token display in gate", () => {
  const src = read("src/components/shared/microsoft-oauth-connect-ui-gate.tsx");
  assert.doesNotMatch(src, /access_token|refresh_token|bearer/i);
});

test("6 no write scope in required list", () => {
  assert.equal(
    MICROSOFT_BUSY_READ_REQUIRED_SCOPES.some((s) => s.includes("ReadWrite")),
    false,
  );
});

test("7 calendar readiness surfaces wire oauth gate", () => {
  const candidate = read("src/components/candidate/candidate-calendar-readiness-workspace.tsx");
  const board = read("src/components/board/board-calendar-readiness-monitor-workspace.tsx");
  assert.match(candidate, /MicrosoftOAuthConnectUiGate/);
  assert.match(board, /MicrosoftOAuthConnectUiGate/);
  assert.match(candidate, new RegExp(MICROSOFT_BUSY_READ_MARKERS.oauthGate));
});

test("8 no invite send sync claim in gate copy", () => {
  const blob =
    read("src/components/shared/microsoft-oauth-connect-ui-gate.tsx") +
    JSON.stringify(en.microsoftBusyRead);
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});

test("9 i18n keys in en and pl", () => {
  assert.ok(en.microsoftBusyRead.connectNotEnabled);
  assert.ok(dictionaries.pl.microsoftBusyRead.forbiddenScopesTitle);
});

test("10 package.json exposes oauth connect ui gate test", () => {
  assert.match(read("package.json"), /test:microsoft-oauth-connect-ui-gate/);
});

test("11 gates default false at build time", () => {
  assert.equal(MICROSOFT_OAUTH_CONNECT_GATE_ENABLED, false);
  const features = read("src/lib/features.ts");
  assert.match(features, /MICROSOFT_OAUTH_CONNECT_GATE_ENABLED/);
  assert.doesNotMatch(features, /NEXT_PUBLIC_MICROSOFT_OAUTH_CONNECT_GATE_ENABLED\s*===\s*"true"\s*\|\|\s*true/);
});

test("12 gate component has no authorize redirect or href", () => {
  const src = read("src/components/shared/microsoft-oauth-connect-ui-gate.tsx");
  assert.doesNotMatch(src, /authorize_url|\/microsoft\/authorize|window\.location|href=/i);
  assert.doesNotMatch(src, /onClick/);
});

test("13 required scopes never include write tokens", () => {
  for (const scope of MICROSOFT_BUSY_READ_REQUIRED_SCOPES) {
    assert.equal(scope.includes("ReadWrite"), false, scope);
    assert.equal(scope.includes("Mail.Send"), false, scope);
  }
  assert.ok(MICROSOFT_BUSY_READ_REQUIRED_SCOPES.includes("Calendars.Read"));
});

test("14 busy read live flag default off in features", () => {
  assert.equal(MICROSOFT_BUSY_READ_ENABLED, false);
});
