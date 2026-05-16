/**
 * Normalized `NEXT_PUBLIC_API_URL` (Railway API). Used by the `/api/v1` proxy and LinkedIn setup copy.
 */
export function getPublicApiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  let u = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  return u;
}

/** OAuth callback URL registered in LinkedIn (must match `LINKEDIN_REDIRECT_URI` on the API). */
export function getPublicLinkedInCallbackUrl(): string | null {
  const base = getPublicApiBase();
  if (!base) return null;
  return `${base}/api/v1/auth/linkedin/callback`;
}
