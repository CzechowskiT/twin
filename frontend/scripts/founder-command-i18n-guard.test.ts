/**
 * Founder Command Center i18n — EN/PL key parity (static, no browser).
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  FOUNDER_COMMAND_MESSAGES_EN,
  FOUNDER_COMMAND_MESSAGES_PL,
} from "../src/lib/founder-command-messages.ts";

test("founder command EN/PL keys match", () => {
  const enKeys = Object.keys(FOUNDER_COMMAND_MESSAGES_EN).sort();
  const plKeys = Object.keys(FOUNDER_COMMAND_MESSAGES_PL).sort();
  assert.deepEqual(plKeys, enKeys);
  assert.ok(FOUNDER_COMMAND_MESSAGES_EN.title.length > 3);
  assert.ok(FOUNDER_COMMAND_MESSAGES_PL.title.length > 3);
});
