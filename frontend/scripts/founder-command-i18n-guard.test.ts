/**
 * Founder Command Center i18n — EN/PL key parity + no browser token UX.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FOUNDER_COMMAND_MESSAGES_EN,
  FOUNDER_COMMAND_MESSAGES_PL,
} from "../src/lib/founder-command-messages.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("founder command EN/PL keys match", () => {
  const enKeys = Object.keys(FOUNDER_COMMAND_MESSAGES_EN).sort();
  const plKeys = Object.keys(FOUNDER_COMMAND_MESSAGES_PL).sort();
  assert.deepEqual(plKeys, enKeys);
  assert.ok(FOUNDER_COMMAND_MESSAGES_EN.title.length > 3);
  assert.ok(FOUNDER_COMMAND_MESSAGES_PL.title.length > 3);
  assert.match(FOUNDER_COMMAND_MESSAGES_EN.operatorHint, /TWIN Product Operator.*Actions.*fallback dashboard/i);
  assert.match(FOUNDER_COMMAND_MESSAGES_PL.operatorHint, /TWIN Product Operator.*Actions.*panel zapasowy/i);
});

test("founder command copy has no manual token field", () => {
  const en = FOUNDER_COMMAND_MESSAGES_EN as Record<string, string>;
  assert.equal(en.tokenLabel, undefined);
  assert.equal(en.tokenHint, undefined);
  assert.ok(en.sessionReady);
  assert.ok(en.forbidden);
  const blob = `${Object.values(FOUNDER_COMMAND_MESSAGES_EN).join("\n")}\n${Object.values(FOUNDER_COMMAND_MESSAGES_PL).join("\n")}`;
  assert.doesNotMatch(blob, /FOUNDER_COMMAND_TOKEN/);
});

test("FCC UI never references FOUNDER_COMMAND_TOKEN or token paste field", () => {
  const ui = readFileSync(join(ROOT, "src/components/founder/founder-command-center.tsx"), "utf8");
  assert.doesNotMatch(ui, /FOUNDER_COMMAND_TOKEN/);
  assert.doesNotMatch(ui, /tokenLabel|STORAGE_KEY|twin_founder_command_token/);
  assert.match(ui, /\/api\/founder-command/);
  assert.match(ui, /data-fcc-start/);
  assert.match(ui, /data-fcc-operator-hint/);
  assert.match(ui, /t\("founderCommand\.operatorHint"\)/);
  assert.match(ui, /LOGIN_NEXT|\/login\?next=/);
});

test("FCC BFF injects server token and never exposes it in client bundle path", () => {
  const bff = readFileSync(join(ROOT, "src/lib/founder-command-bff.ts"), "utf8");
  const route = readFileSync(join(ROOT, "src/app/api/founder-command/[[...path]]/route.ts"), "utf8");
  assert.match(bff, /FOUNDER_COMMAND_TOKEN/);
  assert.match(route, /founderCommandUpstreamToken/);
  assert.match(route, /FOUNDER_COMMAND_ALLOWLIST|founderAllowlistFromEnv/);
  assert.match(route, /X-CSRF-Token/);
});
