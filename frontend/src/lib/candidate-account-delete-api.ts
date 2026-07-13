/** Candidate self-service account deletion API — R-019. */

import { apiFetch } from "@/lib/api";

export const ACCOUNT_DELETE_API_PATH = "/api/v1/candidates/me/delete-account";

export type AccountDeleteResponse = {
  deleted: boolean;
  deleted_at: string;
  privacy_request_id: number;
  message: string;
};

export async function deleteCandidateAccount(
  confirmation: string,
  token?: string | null,
): Promise<AccountDeleteResponse> {
  return apiFetch<AccountDeleteResponse>(
    ACCOUNT_DELETE_API_PATH,
    {
      method: "POST",
      body: JSON.stringify({ confirmation }),
    },
    token,
  );
}
