"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { LinkedInLoginSection } from "@/components/linkedin-login-section";
import { OAuthWebButtons } from "@/components/oauth-web-buttons";
import { useTranslation } from "@/components/language-provider";
import { useMarketingPersona } from "@/components/persona-provider";
import { Button, Card, Input, Label } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import type { LoginZone } from "@/lib/persona-auth";
import { LOGIN_PATH, postLoginPath, REGISTER_PATH } from "@/lib/persona-auth";
import { OAUTH_LOGIN_BUTTONS_ENABLED } from "@/lib/oauth-auth";

type TokenResponse = { access_token: string };

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
    if (err?.endsWith("_not_configured")) return t("login.errorOAuthNotConfigured");
    return null;
  }, [searchParams, t]);

  const displayError = error ?? oauthUrlError;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const token = await apiFetch<TokenResponse>("/api/v1/auth/login/json", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      setToken(token.access_token);
      setPersona(zone);
      router.push(nextPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("Missing API base URL") ||
        msg.includes("TWIN_API_BASE_URL") ||
        msg.includes("NEXT_PUBLIC_API_URL") ||
        msg.includes("Cannot reach API")
      ) {
        setError(t("login.configMissingApi"));
      } else {
        setError(msg || t("login.failed"));
      }
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
      <p className="twin-muted my-4 text-center text-xs uppercase tracking-wide">{t("login.orContinue")}</p>
      <OAuthWebButtons
        status={OAUTH_LOGIN_BUTTONS_ENABLED}
        labels={{
          google: t("login.oauthGoogle"),
          github: t("login.oauthGithub"),
          apple: t("login.oauthApple"),
        }}
      />
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
