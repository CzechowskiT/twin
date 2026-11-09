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
  // Preview is deliberately disconnected from every backend until a
  // non-production API and database are provisioned and independently verified.
  if (process.env.VERCEL_ENV === "preview") return null;
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
  // Both injected build metadata and Vercel's public metadata are checked:
  // browser-side authenticated fetches must not bypass the API proxy guard.
  if (
    process.env.VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_TWIN_PREVIEW_DEPLOYMENT === "true"
  ) return null;
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
