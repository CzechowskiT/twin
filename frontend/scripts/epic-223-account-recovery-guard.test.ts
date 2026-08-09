/**
 * Epic 2.23 — FE guard: hash-token reset, step-up, Access Center recovery cancel.
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

const reset = read("src/app/reset-password/page.tsx");
assert.match(reset, /replaceState/);
assert.match(reset, /#token=|token=/);
assert.match(reset, /freshLogin/);
assert.doesNotMatch(reset, /fingerprint|deviceId|securityScore/i);

const stepUp = read("src/lib/step-up.ts");
assert.match(stepUp, /X-Twin-Step-Up/);
assert.match(stepUp, /SIGN_OUT_EVERYWHERE/);
assert.match(stepUp, /CHANGE_PASSWORD/);
assert.match(stepUp, /CANCEL_RECOVERY/);

const auth = read("src/lib/auth.ts");
assert.match(auth, /stepUpToken/);
assert.match(auth, /X-Twin-Step-Up/);

const access = read("src/components/candidate/access-control-center-workspace.tsx");
assert.match(access, /PENDING_RECOVERY|cancelRecovery|CANCEL_RECOVERY/);
assert.match(access, /SIGN_OUT_EVERYWHERE/);
assert.match(access, /data-step-up-prompt|issueStepUpToken/);
assert.match(access, /forgot-password/);

const msgs = read("src/lib/access-center-messages.ts");
assert.match(msgs, /stepUpTitle/);
assert.match(msgs, /pendingRecoveryNote/);

console.log("epic-223-account-recovery-guard: ok");
