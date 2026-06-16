"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_LOGIN_PROVIDERS,
  OAUTH_LOGIN_BUTTONS_INITIAL,
  type AuthProviderAvailability,
  type OAuthProviderStatus,
  buildOAuthProviderAvailabilities,
  fetchOAuthProviderStatus,
} from "@/lib/oauth-auth";

export type OAuthProviderStatusState = {
  status: OAuthProviderStatus;
  availabilities: AuthProviderAvailability[];
  /** True after the first health/public-health fetch settles (success or failure). */
  loaded: boolean;
  configFetchFailed: boolean;
};

/** Loads non-secret OAuth flags from health + public-health fallback. */
export function useOAuthProviderStatus(): OAuthProviderStatusState {
  const [status, setStatus] = useState<OAuthProviderStatus>(OAUTH_LOGIN_BUTTONS_INITIAL);
  const [loaded, setLoaded] = useState(false);
  const [configFetchFailed, setConfigFetchFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchOAuthProviderStatus().then(({ status: next, configFetchFailed: failed }) => {
      if (cancelled) return;
      setStatus(next);
      setConfigFetchFailed(failed);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const availabilities: AuthProviderAvailability[] = loaded
    ? buildOAuthProviderAvailabilities(status, loaded, configFetchFailed)
    : DEFAULT_LOGIN_PROVIDERS;

  return { status, availabilities, loaded, configFetchFailed };
}
