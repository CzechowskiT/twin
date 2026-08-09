"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { LinkedInLoginSection } from "@/components/linkedin-login-section";
import { OAuthWebButtons } from "@/components/oauth-web-buttons";
import { useTranslation } from "@/components/language-provider";
import { useMarketingPersona } from "@/components/persona-provider";
import { Button, Card, Input, Label } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { clearToken, prepareForCredentialLogin, setToken } from "@/lib/auth";
import {
  LOGIN_REQUEST_TIMEOUT_MS,
  parseLoginAccessToken,
  resolveLoginDiagnosticCode,
  resolveLoginErrorKey,
} from "@/lib/login-error";
import { setSessionPersona } from "@/lib/session-persona";
import type { TranslationKey } from "@/lib/i18n";
import type { LoginZone } from "@/lib/persona-auth";
import { postLoginPath, REGISTER_PATH } from "@/lib/persona-auth";
import { hasConfiguredOAuthProvider } from "@/lib/oauth-auth";
import { useOAuthProviderStatus } from "@/lib/use-oauth-provider-status";

type TokenResponse = { access_token: string; refresh_token?: string | null };

const ZONE_TITLE: Record<LoginZone, TranslationKey> = {
  candidate: "login.zoneCandidateTitle",
  recruiter: "login.zoneRecruiterTitle",
  company: "login.zoneCompanyTitle",
  investor: "login.zoneInvestorTitle",
};

const ZONE_LEAD: Record<LoginZone, TranslationKey> = {
  candidate: "login.zoneCandidateLead",
  recruiter: "login.zoneRecruiterLead",
  company: "login.zoneCompanyLead",
  investor: "login.zoneInvestorLead",
};

export function LoginZoneForm({ zone }: { zone: LoginZone }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { setPersona } = useMarketingPersona();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextPath = useMemo(() => {
    const raw = searchParams.get("next");
    if (raw?.startsWith("/") && !raw.startsWith("//")) return raw;
    return postLoginPath(zone);
  }, [searchParams, zone]);

  const oauthUrlError = useMemo(() => {
    const err = searchParams.get("error");
    if (err === "linkedin_not_configured") return t("login.errorLinkedinNotConfigured");
    if (err === "apple_not_configured") return t("login.errorAppleNotConfigured");
    if (err === "github_not_configured") return t("login.errorGithubNotConfigured");
    if (err?.endsWith("_not_configured")) return t("login.errorOAuthNotConfigured");
    return null;
  }, [searchParams, t]);

  const { status: oauthStatus, availabilities: oauthAvailabilities, loaded: oauthStatusLoaded, configFetchFailed } =
    useOAuthProviderStatus();
  const anyOAuthConfigured = hasConfiguredOAuthProvider(oauthStatus);
  const [userAltLoginExpanded, setUserAltLoginExpanded] = useState<boolean | null>(null);
  const altLoginExpanded =
    userAltLoginExpanded ?? (!oauthStatusLoaded || anyOAuthConfigured);

  const displayError = useMemo(() => {
    if (error) return error;
    if (!oauthUrlError) return null;
    if (!oauthStatusLoaded) return oauthUrlError;
    const err = searchParams.get("error");
    if (err === "apple_not_configured" || err === "github_not_configured") return null;
    return oauthUrlError;
  }, [error, oauthStatusLoaded, oauthUrlError, searchParams]);

  useEffect(() => {
    prepareForCredentialLogin();
  }, []);

  useEffect(() => {
    if (!oauthStatusLoaded) return;
    const err = searchParams.get("error");
    if (err !== "apple_not_configured" && err !== "github_not_configured") return;
    // Stale redirect from API before secrets were applied, or provider still off (UI hides the row).
    const shouldClear =
      (err === "apple_not_configured" && !oauthStatus.apple) ||
      (err === "github_not_configured" && !oauthStatus.github) ||
      (err === "apple_not_configured" && oauthStatus.apple) ||
      (err === "github_not_configured" && oauthStatus.github);
    if (!shouldClear) return;
    const q = new URLSearchParams(searchParams.toString());
    q.delete("error");
    const suffix = q.toString();
    router.replace(suffix ? `${window.location.pathname}?${suffix}` : window.location.pathname);
  }, [oauthStatus, oauthStatusLoaded, router, searchParams]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    prepareForCredentialLogin();
    setLoading(true);
    try {
      const payload = await apiFetch<TokenResponse>(
        "/api/v1/auth/login/json",
        {
          method: "POST",
          timeoutMs: LOGIN_REQUEST_TIMEOUT_MS,
          preserveSessionOnUnauthorized: true,
          body: JSON.stringify({
            email: form.get("email"),
            password: form.get("password"),
          }),
        },
        null,
      );
      const accessToken = parseLoginAccessToken(payload);
      if (!accessToken) {
        setError(t("login.malformedResponse"));
        return;
      }
      setToken(accessToken, payload.refresh_token || null);
      setSessionPersona(zone);
      setPersona(zone);
      router.push(nextPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      clearToken();
      const diagnostic = resolveLoginDiagnosticCode(err, msg);
      if (typeof console !== "undefined") {
        console.warn("[TWIN login]", diagnostic);
      }
      setError(t(resolveLoginErrorKey(err, msg)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
        {t(
          (
            {
              candidate: "nav.personaCandidate",
              recruiter: "nav.personaRecruiter",
              company: "nav.personaCompany",
              investor: "nav.personaInvestor",
            } as const
          )[zone],
        )}
      </p>
      <h1 className="mb-2 mt-1 text-2xl font-semibold">{t(ZONE_TITLE[zone])}</h1>
      <p className="twin-muted mb-4 text-sm leading-relaxed">{t(ZONE_LEAD[zone])}</p>
      {zone === "company" ? (
        <p className="twin-muted mb-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/80 px-3 py-2 text-xs leading-relaxed">
          {t("login.zoneCompanyDemoHint")}
        </p>
      ) : null}
      <LinkedInLoginSection emailLoginHref="#login-email" />
      <form onSubmit={onSubmit} className="mt-4">
        <Label htmlFor="login-email">{t("login.email")}</Label>
        <Input id="login-email" name="email" type="email" required autoComplete="email" />
        <Label>{t("login.password")}</Label>
        <Input name="password" type="password" required autoComplete="current-password" />
        <p className="mb-4 text-right text-sm">
          <Link href="/forgot-password" className="twin-link">
            {t("login.forgotPassword")}
          </Link>
        </p>
        {displayError && <p className="mb-4 text-sm text-red-600">{displayError}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? t("login.signingIn") : t("login.submit")}
        </Button>
      </form>
      {!altLoginExpanded ? (
        <button
          type="button"
          className="twin-link mt-4 w-full text-center text-sm font-semibold"
          onClick={() => setUserAltLoginExpanded(true)}
        >
          {t("login.showAllLoginOptions")}
        </button>
      ) : (
        <>
          <p className="twin-muted my-4 text-center text-xs uppercase tracking-wide">{t("login.orContinue")}</p>
          {!oauthStatusLoaded ? (
            <p className="twin-muted mb-2 text-center text-xs" aria-live="polite">
              {t("login.oauthStatusLoading")}
            </p>
          ) : configFetchFailed ? (
            <p className="mb-2 text-center text-xs text-amber-700" role="status">
              {t("login.oauthRefreshFailed")}
            </p>
          ) : null}
          <OAuthWebButtons
            availabilities={oauthAvailabilities}
            unavailableLabel={t("login.oauthUnavailable")}
            disabledReasonLabel={t("login.oauthDisabledReason")}
            refreshFailedLabel={t("login.oauthRefreshFailed")}
            loadingLabel={t("login.oauthStatusLoading")}
            labels={{
              google: t("login.oauthGoogle"),
              github: t("login.oauthGithub"),
              microsoft: t("login.oauthMicrosoft"),
            }}
          />
          {oauthStatusLoaded && !anyOAuthConfigured ? (
            <button
              type="button"
              className="twin-link mt-2 w-full text-center text-xs"
              onClick={() => setUserAltLoginExpanded(false)}
            >
              {t("login.hideLoginOptions")}
            </button>
          ) : null}
        </>
      )}
      <p className="twin-muted mt-4 text-center text-sm">
        {t("login.noAccount")}{" "}
        <Link href={REGISTER_PATH[zone]} className="twin-link">
          {t("login.register")}
        </Link>
      </p>
      <p className="twin-muted mt-3 text-center text-xs">
        <Link href="/login" className="twin-link">
          {t("login.allZones")}
        </Link>
      </p>
    </Card>
  );
}
