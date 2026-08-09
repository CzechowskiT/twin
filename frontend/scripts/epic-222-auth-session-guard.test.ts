/**
 * Epic 2.22 — FE guard: managed session UX, IA=7, Access Center recovery link.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const ia = read("src/lib/candidate-ia.ts");
const primary = ia.split("CANDIDATE_SECONDARY_IA")[0];
assert.equal((primary.match(/href:/g) || []).length, 7, "primary IA must stay 7");

const auth = read("src/lib/auth.ts");
assert.match(auth, /logoutSession/);
assert.match(auth, /REFRESH_KEY|twin_refresh_token/);
assert.doesNotMatch(auth, /fingerprint|deviceId|last_active/i);

const access = read("src/components/candidate/access-control-center-workspace.tsx");
assert.match(access, /recoveryLink|forgot-password/);
assert.match(access, /signOutEverywhere|logoutSession/);
assert.match(access, /sessionsNote/);

const msgs = read("src/lib/access-center-messages.ts");
assert.match(msgs, /recoveryLead/);
assert.match(msgs, /signOutEverywhere/);

console.log("epic-222-auth-session-guard: ok");
