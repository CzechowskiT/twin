function normalizeApiBaseUrl(raw: string): string {
  let u = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  return u;
}

/**
 * Upstream FastAPI base URL for **server-side** proxy (`/api/v1/...`).
 *
 * Prefer a server-only env on Vercel (`TWIN_API_BASE_URL` or `API_URL`) so the Railway URL
 * is not required in the browser bundle. Falls back to `NEXT_PUBLIC_API_URL` when set.
 */
export function getUpstreamApiBase(): string | null {
  for (const key of ["TWIN_API_BASE_URL", "API_URL", "NEXT_PUBLIC_API_URL"] as const) {
    const raw = process.env[key]?.trim();
    if (raw) return normalizeApiBaseUrl(raw);
  }
  return null;
}

/**
 * Normalized `NEXT_PUBLIC_API_URL` for **client-visible** hints (LinkedIn callback copy, etc.).
 */
export function getPublicApiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  return normalizeApiBaseUrl(raw);
}

/** OAuth callback URL registered in LinkedIn (must match `LINKEDIN_REDIRECT_URI` on the API). */
export function getPublicLinkedInCallbackUrl(): string | null {
  const base = getPublicApiBase();
  if (!base) return null;
  return `${base}/api/v1/auth/linkedin/callback`;
}
