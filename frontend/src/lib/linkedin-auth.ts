import { API_URL } from "@/lib/api";

export type LinkedInAuthStatus = { configured: boolean };

export async function fetchLinkedInAuthStatus(): Promise<LinkedInAuthStatus> {
  const res = await fetch(`${API_URL}/api/v1/auth/linkedin/status`);
  if (!res.ok) {
    return { configured: false };
  }
  return res.json() as Promise<LinkedInAuthStatus>;
}
