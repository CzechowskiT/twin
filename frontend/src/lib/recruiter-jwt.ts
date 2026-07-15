/**
 * Recruiter session JWT — storage, exchange, and header helpers.
 * Authorization is backend-authoritative; local expiry check is UX-only (same as candidate auth.ts).
 */

export const RECRUITER_JWT_STORAGE_KEY = "twin_recruiter_jwt";
export const RECRUITER_JWT_COMPANY_KEY = "twin_recruiter_jwt_company";

export type RecruiterJwtSession = {
  jwt: string;
  companySlug: string;
};

function recruiterStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Decode JWT payload without verification — expiry UX only, not authorization. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isRecruiterJwtStale(jwt: string | null): boolean {
  if (!jwt?.trim()) return true;
  const payload = decodeJwtPayload(jwt.trim());
  if (!payload) return true;
  const exp = payload.exp;
  if (typeof exp !== "number") return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return exp <= nowSec + 30;
}

export function readRecruiterJwtSession(): RecruiterJwtSession {
  const store = recruiterStorage();
  if (!store) return { jwt: "", companySlug: "" };
  try {
    return {
      jwt: store.getItem(RECRUITER_JWT_STORAGE_KEY)?.trim() ?? "",
      companySlug: store.getItem(RECRUITER_JWT_COMPANY_KEY)?.trim() ?? "",
    };
  } catch {
    return { jwt: "", companySlug: "" };
  }
}

export function writeRecruiterJwtSession(jwt: string, companySlug: string): void {
  const store = recruiterStorage();
  if (!store) return;
  try {
    store.setItem(RECRUITER_JWT_STORAGE_KEY, jwt.trim());
    store.setItem(RECRUITER_JWT_COMPANY_KEY, companySlug.trim());
  } catch {
    /* private mode */
  }
}

export function clearRecruiterJwtSession(): void {
  const store = recruiterStorage();
  if (!store) return;
  try {
    store.removeItem(RECRUITER_JWT_STORAGE_KEY);
    store.removeItem(RECRUITER_JWT_COMPANY_KEY);
  } catch {
    /* ignore */
  }
}

/** True when a non-stale recruiter JWT is stored (clears expired blobs). */
export function hasRecruiterJwtSession(): boolean {
  const { jwt, companySlug } = readRecruiterJwtSession();
  if (!jwt || !companySlug) return false;
  if (isRecruiterJwtStale(jwt)) {
    clearRecruiterJwtSession();
    return false;
  }
  return true;
}

export type RecruiterSessionExchangeResult =
  | { ok: true; jwt: string; companySlug: string }
  | { ok: false; status: number; detail: string };

/** Exchange pilot access token for backend-verified session JWT. */
export async function exchangeRecruiterPilotToken(
  accessToken: string,
  companySlug: string,
): Promise<RecruiterSessionExchangeResult> {
  const res = await fetch("/api/v1/auth/recruiter/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken.trim(),
      company_slug: companySlug.trim(),
    }),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    let detail = bodyText;
    try {
      const parsed = JSON.parse(bodyText) as { detail?: string };
      if (typeof parsed.detail === "string") detail = parsed.detail;
    } catch {
      /* keep raw */
    }
    return { ok: false, status: res.status, detail };
  }
  const data = JSON.parse(bodyText) as {
    access_token?: string;
    company_slug?: string;
  };
  const jwt = data.access_token?.trim() ?? "";
  const slug = data.company_slug?.trim() ?? companySlug.trim();
  if (!jwt) {
    return { ok: false, status: 502, detail: "recruiter_session_missing_token" };
  }
  writeRecruiterJwtSession(jwt, slug);
  return { ok: true, jwt, companySlug: slug };
}

/** Authorization header for recruiter API calls — never put JWT in query strings. */
export function recruiterJwtAuthHeaders(jwt: string, extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt.trim()}`,
  };
  if (extra) {
    if (extra instanceof Headers) {
      extra.forEach((v, k) => {
        headers[k] = v;
      });
    } else if (Array.isArray(extra)) {
      for (const [k, v] of extra) headers[k] = v;
    } else {
      Object.assign(headers, extra);
    }
  }
  return headers;
}

/** company_slug query only — token must travel in Authorization header. */
export function recruiterCompanyQuery(companySlug: string): URLSearchParams {
  return new URLSearchParams({ company_slug: companySlug.trim() });
}
