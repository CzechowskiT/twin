import assert from "node:assert/strict";

import {
  COOKIE_CONSENT_STORAGE_VERSION,
  parseCookieConsentJson,
} from "../src/lib/cookie-consent";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (e) {
    console.error(`fail ${name}`, e);
    process.exitCode = 1;
  }
}

run("parses canonical record", () => {
  const raw = JSON.stringify({
    version: 1,
    necessary: true,
    analytics: true,
    marketing: false,
    decidedAt: "2026-05-23T10:00:00.000Z",
  });
  const parsed = parseCookieConsentJson(raw);
  assert.equal(parsed?.version, COOKIE_CONSENT_STORAGE_VERSION);
  assert.equal(parsed?.analytics, true);
  assert.equal(parsed?.marketing, false);
});

run("parses legacy v field", () => {
  const raw = JSON.stringify({
    v: 1,
    analytics: false,
    marketing: false,
    decidedAt: "2026-01-01T00:00:00.000Z",
  });
  const parsed = parseCookieConsentJson(raw);
  assert.equal(parsed?.analytics, false);
  assert.equal(parsed?.necessary, true);
});

run("rejects invalid version", () => {
  const raw = JSON.stringify({ version: 2, analytics: true, marketing: true, decidedAt: "x" });
  assert.equal(parseCookieConsentJson(raw), null);
});

run("rejects malformed json", () => {
  assert.equal(parseCookieConsentJson("{"), null);
});

if (process.exitCode) {
  process.exit(process.exitCode);
}
