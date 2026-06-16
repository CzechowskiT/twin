import { createRequestDeduper } from "@/lib/create-request-deduper";
import { fetchPublicHealthJson } from "@/lib/public-health-client";

const healthOpsDeduper = createRequestDeduper(30_000);

export type OAuthProviderStatus = {
  linkedin: boolean;
  google: boolean;
  github: boolean;
  apple: boolean;
  microsoft: boolean;
};

export type OAuthWebProvider = "google" | "github" | "microsoft";

export type AuthProviderAvailabilityReason =
  | "loading"
  | "not_configured"
  | "provider_disabled"
  | "config_fetch_failed"
  | "rate_limited";

export type AuthProviderAvailability = {
  provider: OAuthWebProvider;
  configured: boolean;
  available: boolean;
  loading: boolean;
  reason?: AuthProviderAvailabilityReason;
  href?: string;
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
  linkedin_oauth_configured?: boolean;
};

const OAUTH_WEB_PROVIDERS: OAuthWebProvider[] = ["google", "github", "microsoft"];

function parseHealthOpsOAuthFlags(data: HealthOpsOAuthFlags): OAuthProviderStatus {
  return {
    linkedin: Boolean(data.linkedin_oauth_configured ?? true),
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

function oauthLoginHref(provider: OAuthWebProvider): string {
  return `/api/v1/auth/${provider}/login`;
}

function buildWebProviderAvailabilities(
  status: OAuthProviderStatus,
  options: { loading: boolean; configFetchFailed: boolean },
): AuthProviderAvailability[] {
  return OAUTH_WEB_PROVIDERS.map((provider) => {
    const configured = status[provider];
    const href = oauthLoginHref(provider);
    if (options.loading) {
      return {
        provider,
        configured,
        available: false,
        loading: true,
        reason: "loading",
      };
    }
    if (configured) {
      return {
        provider,
        configured: true,
        available: true,
        loading: false,
        href,
      };
    }
    return {
      provider,
      configured: false,
      available: false,
      loading: false,
      reason: options.configFetchFailed ? "config_fetch_failed" : "not_configured",
    };
  });
}

export function buildOAuthProviderAvailabilities(
  status: OAuthProviderStatus,
  loaded: boolean,
  configFetchFailed: boolean,
): AuthProviderAvailability[] {
  return buildWebProviderAvailabilities(status, { loading: !loaded, configFetchFailed });
}

async function fetchHealthOpsFlags(path: string): Promise<HealthOpsOAuthFlags | null> {
  const dedupeKey = `health-ops:${path}`;
  try {
    return await healthOpsDeduper(dedupeKey, async () => {
      const res = await fetch(path, {
        cache: "no-store",
        signal: AbortSignal.timeout(OAUTH_STATUS_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      return (await res.json()) as HealthOpsOAuthFlags;
    });
  } catch {
    return null;
  }
}

/** Loads OAuth ops flags; falls back to public-health when health?ops=1 fails. */
export async function fetchOAuthProviderStatus(): Promise<{
  status: OAuthProviderStatus;
  configFetchFailed: boolean;
}> {
  const [healthData, publicData] = await Promise.all([
    fetchHealthOpsFlags("/api/v1/health?ops=1"),
    fetchPublicHealthJson<HealthOpsOAuthFlags>().catch(() => null),
  ]);

  const healthStatus = healthData ? parseHealthOpsOAuthFlags(healthData) : null;
  const publicStatus = publicData ? parseHealthOpsOAuthFlags(publicData) : null;

  if (healthStatus) {
    return { status: healthStatus, configFetchFailed: false };
  }

  if (publicStatus) {
    return { status: publicStatus, configFetchFailed: true };
  }

  return { status: OAUTH_LOGIN_BUTTONS_INITIAL, configFetchFailed: true };
}
