"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { LinkedInLoginButton } from "@/components/linkedin-login-button";
import { LinkedInSetupHint } from "@/components/linkedin-setup-hint";
import { LegalRegionNotice } from "@/components/legal-region-notice";
import { OAuthWebButtons } from "@/components/oauth-web-buttons";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken, setToken } from "@/lib/auth";
import { fetchOAuthProviderStatus, type OAuthProviderStatus } from "@/lib/oauth-auth";

type RegisterSuccessResponse = { access_token: string };

type SessionPhase = "boot" | "anon" | "gone";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("boot");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthProviderStatus | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const safeNext = useMemo(() => {
    const nextRaw = searchParams.get("next");
    return nextRaw?.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setSessionPhase("anon");
      return;
    }
    void (async () => {
      try {
        await apiFetch("/api/v1/auth/me", {}, token);
        if (cancelled) return;
        setSessionPhase("gone");
        router.replace(safeNext);
      } catch {
        if (!cancelled) setSessionPhase("anon");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, safeNext]);

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

  function selectAllConsentCheckboxes() {
    const root = formRef.current;
    if (!root) return;
    const names = [
      "gdpr_privacy",
      "terms_of_service",
      "job_data_processing",
      "ai_matching",
      "marketing_emails_opt_in",
    ] as const;
    for (const name of names) {
      const el = root.querySelector<HTMLInputElement>(`input[type="checkbox"][name="${name}"]`);
      if (el) el.checked = true;
    }
  }

  const attributionFromUrl = useMemo(() => {
    const ref = searchParams.get("ref")?.trim();
    const utm_source = searchParams.get("utm_source")?.trim();
    const utm_medium = searchParams.get("utm_medium")?.trim();
    const utm_campaign = searchParams.get("utm_campaign")?.trim();
    const utm_content = searchParams.get("utm_content")?.trim();
    const out: Record<string, string> = {};
    if (ref) out.ref = ref.slice(0, 128);
    if (utm_source) out.utm_source = utm_source.slice(0, 128);
    if (utm_medium) out.utm_medium = utm_medium.slice(0, 128);
    if (utm_campaign) out.utm_campaign = utm_campaign.slice(0, 128);
    if (utm_content) out.utm_content = utm_content.slice(0, 128);
    return out;
  }, [searchParams]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const gdpr = form.get("gdpr_privacy") === "on";
    const terms = form.get("terms_of_service") === "on";
    const jobData = form.get("job_data_processing") === "on";
    const ai = form.get("ai_matching") === "on";
    if (!email || !password) {
      setError(t("register.emailPasswordRequired"));
      return;
    }
    if (!gdpr || !terms || !jobData || !ai) {
      setError(t("register.coreConsentsRequired"));
      return;
    }
    setLoading(true);
    try {
      const referredRaw = String(form.get("referred_by_note") ?? "").trim();
      const registered = await apiFetch<RegisterSuccessResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          gdpr_consent: true,
          terms_of_service_consent: true,
          job_data_processing_consent: true,
          ai_matching_consent: true,
          marketing_emails_opt_in: form.get("marketing_emails_opt_in") === "on",
          ...attributionFromUrl,
          ...(referredRaw ? { referred_by_note: referredRaw.slice(0, 500) } : {}),
        }),
      });
      setToken(registered.access_token);
      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("register.failed"));
    } finally {
      setLoading(false);
    }
  }

  if (sessionPhase === "boot" || sessionPhase === "gone") {
    return (
      <Shell rail>
        <Card>
          <p className="twin-muted text-sm">{t("authCallback.signingIn")}</p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell rail>
      <Card>
        <h1 className="mb-6 text-2xl font-semibold">{t("register.title")}</h1>
        <form ref={formRef} onSubmit={onSubmit}>
          <Label>{t("register.email")}</Label>
          <Input name="email" type="email" required autoComplete="email" />
          <Label>{t("register.password")}</Label>
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
          <Label>{t("register.referredByLabel")}</Label>
          <textarea
            name="referred_by_note"
            rows={2}
            maxLength={500}
            autoComplete="off"
            placeholder={t("register.referredByPlaceholder")}
            className="twin-touch-target mb-4 w-full max-w-full resize-y rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--twin-muted)] focus:border-[var(--twin-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--twin-accent)]/20 sm:text-sm"
          />
          <p className="twin-muted mb-4 text-xs">{t("register.referredByHint")}</p>
          <LegalRegionNotice />
          <Button
            type="button"
            className="mb-4 border border-[var(--twin-border)] bg-[var(--twin-input-bg)] text-[var(--foreground)] hover:bg-[var(--twin-border)]/30"
            onClick={selectAllConsentCheckboxes}
          >
            {t("register.selectAllConsents")}
          </Button>
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
