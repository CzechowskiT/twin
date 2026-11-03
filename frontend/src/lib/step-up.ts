/** Epic 2.23 — purpose-bound step-up helper (password reauth; no MFA). */

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export type StepUpPurpose =
  | "SIGN_OUT_EVERYWHERE"
  | "CANCEL_RECOVERY"
  | "CANCEL_RECOVERY_PENDING"
  | "CHANGE_PASSWORD"
  | "ACCOUNT_DELETION"
  | "FULL_PRIVACY_EXPORT"
  | "MFA_ENROLL"
  | "MFA_DISABLE"
  | "MFA_REPLACE"
  | "MFA_RECOVERY_RESET";

export async function issueStepUpToken(
  purpose: StepUpPurpose,
  password: string,
): Promise<string> {
  const token = getToken();
  if (!token) throw new Error("not_authenticated");
  const res = await apiFetch<{ step_up_token_once?: string }>(
    "/api/v1/auth/step-up/issue",
    {
      method: "POST",
      body: JSON.stringify({ purpose, password }),
    },
    token,
  );
  const once = (res.step_up_token_once || "").trim();
  if (!once) throw new Error("step_up_issue_failed");
  return once;
}

export function stepUpHeaders(stepUpToken: string): Record<string, string> {
  return { "X-Twin-Step-Up": stepUpToken };
}
