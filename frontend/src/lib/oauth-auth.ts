import { API_URL } from "@/lib/api";

export type OAuthProviderStatus = {
  linkedin: boolean;
  google: boolean;
  github: boolean;
  apple: boolean;
  microsoft: boolean;
};

export async function fetchOAuthProviderStatus(): Promise<OAuthProviderStatus> {
  const res = await fetch(`${API_URL}/api/v1/auth/oauth/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<OAuthProviderStatus>;
}
