"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { LinkedInLoginButton } from "@/components/linkedin-login-button";
import { LinkedInSetupHint } from "@/components/linkedin-setup-hint";
import { LegalRegionNotice } from "@/components/legal-region-notice";
import { OAuthWebButtons } from "@/components/oauth-web-buttons";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { fetchOAuthProviderStatus, type OAuthProviderStatus } from "@/lib/oauth-auth";

type TokenResponse = { access_token: string };

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthProviderStatus | null>(null);

  useEffect(() => {
    fetchOAuthProviderStatus()
      .then((s) => setOauthStatus(s))
      .catch(() =>
        setOauthStatus({
          linkedin: false,
          google: false,
          github: false,
          apple: false,
        }),
      );
  }, []);

  const oauthUrlError = useMemo(() => {
    const err = searchParams.get("error");
    if (err === "linkedin_not_configured") return t("register.errorLinkedinNotConfigured");
    if (err?.endsWith("_not_configured")) return t("register.errorOAuthNotConfigured");
    return null;
  }, [searchParams, t]);

  const displayError = error ?? oauthUrlError;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const gdpr = form.get("gdpr_privacy") === "on";
    const terms = form.get("terms_of_service") === "on";
    const jobData = form.get("job_data_processing") === "on";
    const ai = form.get("ai_matching") === "on";
    if (!gdpr || !terms || !jobData || !ai) {
      setError(t("register.coreConsentsRequired"));
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          gdpr_consent: true,
          terms_of_service_consent: true,
          job_data_processing_consent: true,
          ai_matching_consent: true,
          marketing_emails_opt_in: form.get("marketing_emails_opt_in") === "on",
        }),
      });
      const token = await apiFetch<TokenResponse>("/api/v1/auth/login/json", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      setToken(token.access_token);
      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("register.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell rail>
      <Card>
        <h1 className="mb-6 text-2xl font-semibold">{t("register.title")}</h1>
        <form onSubmit={onSubmit}>
          <Label>{t("register.email")}</Label>
          <Input name="email" type="email" required autoComplete="email" />
          <Label>{t("register.password")}</Label>
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
          <LegalRegionNotice />
          <label className="mb-4 flex items-start gap-2 text-sm">
            <input name="gdpr_privacy" type="checkbox" className="mt-1" required />
            <span>
              {t("register.consentPrivacyBefore")}{" "}
              <Link href="/privacy" className="twin-link underline" target="_blank">
                {t("register.privacyPolicy")}
              </Link>{" "}
              {t("register.consentPrivacyAfter")}
            </span>
          </label>
          <label className="mb-4 flex items-start gap-2 text-sm">
            <input name="terms_of_service" type="checkbox" className="mt-1" required />
            <span>
              {t("register.consentTermsBefore")}{" "}
              <Link href="/terms" className="twin-link underline" target="_blank" rel="noopener noreferrer">
                {t("register.termsOfService")}
              </Link>{" "}
              {t("register.consentTermsAfter")}
            </span>
          </label>
          <label className="mb-4 flex items-start gap-2 text-sm">
            <input name="job_data_processing" type="checkbox" className="mt-1" required />
            <span>
              {t("register.consentJobDataBefore")}{" "}
              <Link href="/privacy" className="twin-link underline" target="_blank">
                {t("register.privacyPolicy")}
              </Link>{" "}
              {t("register.consentJobDataAfter")}
            </span>
          </label>
          <label className="mb-6 flex items-start gap-2 text-sm">
            <input name="ai_matching" type="checkbox" className="mt-1" required />
            <span>
              {t("register.consentAiBefore")}{" "}
              <Link href="/privacy" className="twin-link underline" target="_blank">
                {t("register.privacyPolicy")}
              </Link>{" "}
              {t("register.consentAiAfter")}
            </span>
          </label>
          <label className="mb-6 flex items-start gap-2 text-sm">
            <input name="marketing_emails_opt_in" type="checkbox" className="mt-1" />
            <span>
              <span className="font-medium text-[var(--foreground)]">{t("register.marketingOptIn")}</span>
              <span className="mt-1 block text-xs text-[var(--twin-muted-strong)]">{t("register.marketingHint")}</span>
            </span>
          </label>
          {displayError && <p className="mb-4 text-sm text-red-600">{displayError}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? t("register.creating") : t("register.submit")}
          </Button>
        </form>
        {oauthStatus !== null && (
          <>
            <p className="twin-muted my-4 text-center text-xs uppercase tracking-wide">
              {t("register.orContinue")}
            </p>
            <OAuthWebButtons
              status={oauthStatus}
              labels={{
                google: t("login.oauthGoogle"),
                github: t("login.oauthGithub"),
                apple: t("login.oauthApple"),
              }}
            />
            {!oauthStatus.linkedin && <LinkedInSetupHint variant="register" />}
            <LinkedInLoginButton
              label={t("register.linkedIn")}
              configured={oauthStatus.linkedin}
              comingSoonMessage={t("register.linkedInComingSoon")}
            />
          </>
        )}
        <p className="twin-muted mt-4 text-center text-sm">
          {t("register.hasAccount")}{" "}
          <Link href="/login" className="twin-link">
            {t("register.login")}
          </Link>
        </p>
      </Card>
    </Shell>
  );
}

export default function RegisterPage() {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <Shell rail>
          <Card>
            <p className="twin-muted text-sm">{t("register.creating")}</p>
          </Card>
        </Shell>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
