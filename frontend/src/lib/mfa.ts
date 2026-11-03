/** Epic 2.24 — opt-in TOTP MFA client helpers (never log secrets/codes). */

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { stepUpHeaders, issueStepUpToken } from "@/lib/step-up";

export type MfaStatus = {
  state?: string;
  enabled?: boolean;
  recovery_codes_remaining?: number;
};

export async function fetchMfaStatus(): Promise<MfaStatus> {
  const token = getToken();
  if (!token) throw new Error("not_authenticated");
  return apiFetch<MfaStatus>("/api/v1/auth/mfa/status", {}, token);
}

export async function startMfaEnroll(password: string): Promise<{
  secret_once?: string;
  otpauth_uri_once?: string;
  factor_key?: string;
}> {
  const token = getToken();
  if (!token) throw new Error("not_authenticated");
  const step = await issueStepUpToken("MFA_ENROLL" as never, password);
  return apiFetch(
    "/api/v1/auth/mfa/enroll/start",
    { method: "POST", headers: stepUpHeaders(step) },
    token,
  );
}

export async function verifyMfaEnroll(code: string): Promise<unknown> {
  const token = getToken();
  if (!token) throw new Error("not_authenticated");
  return apiFetch("/api/v1/auth/mfa/enroll/verify", { method: "POST", body: JSON.stringify({ code }) }, token);
}

export async function presentMfaRecoveryCodes(): Promise<{ recovery_codes_once?: string[] }> {
  const token = getToken();
  if (!token) throw new Error("not_authenticated");
  return apiFetch("/api/v1/auth/mfa/enroll/recovery-codes", { method: "POST", body: "{}" }, token);
}

export async function disableMfa(password: string): Promise<unknown> {
  const token = getToken();
  if (!token) throw new Error("not_authenticated");
  const step = await issueStepUpToken("MFA_DISABLE" as never, password);
  return apiFetch("/api/v1/auth/mfa/disable", { method: "POST", headers: stepUpHeaders(step) }, token);
}

export async function completeMfaLogin(opts: {
  mfa_challenge_token: string;
  totp_code?: string;
  recovery_code?: string;
}): Promise<{ access_token?: string; refresh_token?: string | null }> {
  return apiFetch("/api/v1/auth/mfa/challenge/complete", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}
