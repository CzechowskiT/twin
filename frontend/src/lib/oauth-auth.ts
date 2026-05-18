/**
 * OAuth rows on login/register are always shown as active links.
 * Misconfiguration is handled by the API redirect (?error=…_not_configured) — we do not call a
 * public status endpoint (that would leak which providers are configured on the server).
 */
export type OAuthProviderStatus = {
  linkedin: boolean;
  google: boolean;
  github: boolean;
  apple: boolean;
};

/** UI treats all social rows as enabled; the API gates real OAuth on redirect. */
export const OAUTH_LOGIN_BUTTONS_ENABLED: OAuthProviderStatus = {
  linkedin: true,
  google: true,
  github: true,
  apple: true,
};
