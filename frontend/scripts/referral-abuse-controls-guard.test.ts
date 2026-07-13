/** Referral abuse controls doc guard — contract for #448. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = join(repoRoot, "docs/REFERRAL_ABUSE_CONTROLS_B3_2026-07-13.md");

test("1 referral abuse doc exists", () => {
  assert.match(readFileSync(DOC, "utf8"), /Self-referral/);
});

test("2 rate limit documented", () => {
  assert.match(readFileSync(DOC, "utf8"), /Rate limit/i);
});

test("3 data lifecycle references referrals", () => {
  const lifecycle = readFileSync(join(repoRoot, "docs/DATA_LIFECYCLE_CONTRACT_2026-07-13.md"), "utf8");
  assert.match(lifecycle, /Referrals/);
  assert.match(lifecycle, /Abuse/i);
});
