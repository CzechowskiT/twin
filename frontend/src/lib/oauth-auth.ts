/**
 * OAuth button availability. Uses `GET /api/v1/health?ops=1` (already public for deploy checks;
 * returns booleans only, no secrets). While loading, rows stay hidden/disabled until flags arrive.
 */
export type OAuthProviderStatus = {
  linkedin: boolean;
  google: boolean;
  github: boolean;
  apple: boolean;
  microsoft: boolean;
};

/** Safe defaults before health fetch — no clickable OAuth until the API confirms configuration. */
export const OAUTH_LOGIN_BUTTONS_INITIAL: OAuthProviderStatus = {
  linkedin: false,
  google: false,
  github: false,
  apple: false,
  microsoft: false,
};

/** @deprecated Use OAUTH_LOGIN_BUTTONS_INITIAL; kept for imports that expected the old name. */
export const OAUTH_LOGIN_BUTTONS_ENABLED = OAUTH_LOGIN_BUTTONS_INITIAL;

type HealthOpsOAuthFlags = {
  google_oauth_configured?: boolean;
  github_oauth_configured?: boolean;
  apple_oauth_configured?: boolean;
  microsoft_oauth_configured?: boolean;
};

function parseHealthOpsOAuthFlags(data: HealthOpsOAuthFlags): OAuthProviderStatus {
  return {
    linkedin: true,
    google: Boolean(data.google_oauth_configured),
    github: Boolean(data.github_oauth_configured),
    apple: Boolean(data.apple_oauth_configured),
    microsoft: Boolean(data.microsoft_oauth_configured),
  };
}

export function hasConfiguredOAuthProvider(status: OAuthProviderStatus): boolean {
  return status.google || status.github || status.microsoft;
}

/** Same window as login password POST — OAuth flags must not block the form indefinitely. */
export const OAUTH_STATUS_FETCH_TIMEOUT_MS = 10_000;

export async function fetchOAuthProviderStatus(): Promise<OAuthProviderStatus> {
  try {
    const res = await fetch("/api/v1/health?ops=1", {
      cache: "no-store",
      signal: AbortSignal.timeout(OAUTH_STATUS_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return OAUTH_LOGIN_BUTTONS_INITIAL;
    const data = (await res.json()) as HealthOpsOAuthFlags;
    return parseHealthOpsOAuthFlags(data);
  } catch {
    return OAUTH_LOGIN_BUTTONS_INITIAL;
  }
}
