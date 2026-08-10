/**
 * Epic 2.24 — FE guard: opt-in TOTP MFA, IA=7, no SMS/passkeys UI.
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

const mfa = read("src/lib/mfa.ts");
assert.match(mfa, /MFA_ENROLL|enroll\/start/);
assert.match(mfa, /challenge\/complete/);
assert.doesNotMatch(mfa, /webauthn|passkey|smsOtp|emailOtp/i);

const login = read("src/components/auth/login-zone-form.tsx");
assert.match(login, /mfa_required|mfaChallenge|completeMfaLogin/);

const access = read("src/components/candidate/access-control-center-workspace.tsx");
assert.match(access, /data-mfa-opt-in|MfaOptInPanel|mfaEnroll/);
assert.doesNotMatch(access, /webauthn|passkey|SMS OTP/i);

const msgs = read("src/lib/access-center-messages.ts");
assert.match(msgs, /mfaLead/);
assert.match(msgs, /mfaNotFirstValue/);

console.log("epic-224-totp-mfa-guard: ok");
