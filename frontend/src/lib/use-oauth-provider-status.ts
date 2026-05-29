"use client";

import { useEffect, useState } from "react";

import {
  OAUTH_LOGIN_BUTTONS_INITIAL,
  type OAuthProviderStatus,
  fetchOAuthProviderStatus,
} from "@/lib/oauth-auth";

export type OAuthProviderStatusState = {
  status: OAuthProviderStatus;
  /** True after the first health?ops=1 fetch settles (success or failure). */
  loaded: boolean;
};

/** Loads non-secret OAuth flags from `GET /api/v1/health?ops=1` (same-origin proxy). */
export function useOAuthProviderStatus(): OAuthProviderStatusState {
  const [status, setStatus] = useState<OAuthProviderStatus>(OAUTH_LOGIN_BUTTONS_INITIAL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchOAuthProviderStatus().then((next) => {
      if (cancelled) return;
      setStatus(next);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, loaded };
}
