"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { LinkedInLoginButton } from "@/components/linkedin-login-button";
import { LinkedInSetupHint } from "@/components/linkedin-setup-hint";
import { OAuthWebButtons } from "@/components/oauth-web-buttons";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { fetchOAuthProviderStatus, type OAuthProviderStatus } from "@/lib/oauth-auth";

type TokenResponse = { access_token: string };

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthProviderStatus | null>(null);

  useEffect(() => {
    fetchOAuthProviderStatus()
      .then((status) => setOauthStatus(status))
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
      router.push("/dashboard");
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
    <Shell rail>
      <Card>
        <h1 className="mb-6 text-2xl font-semibold">{t("login.title")}</h1>
        <form onSubmit={onSubmit}>
          <Label>{t("login.email")}</Label>
          <Input name="email" type="email" required autoComplete="email" />
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
        {oauthStatus !== null && (
          <>
            <p className="twin-muted my-4 text-center text-xs uppercase tracking-wide">
              {t("login.orContinue")}
            </p>
            <OAuthWebButtons
              status={oauthStatus}
              labels={{
                google: t("login.oauthGoogle"),
                github: t("login.oauthGithub"),
                apple: t("login.oauthApple"),
              }}
            />
            {!oauthStatus.linkedin && <LinkedInSetupHint />}
            <LinkedInLoginButton
              label={t("login.linkedIn")}
              configured={oauthStatus.linkedin}
              comingSoonMessage={t("login.linkedInComingSoon")}
            />
          </>
        )}
        <p className="twin-muted mt-4 text-center text-sm">
          {t("login.noAccount")}{" "}
          <Link href="/register" className="twin-link">
            {t("login.register")}
          </Link>
        </p>
      </Card>
    </Shell>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <Shell rail>
          <Card>
            <p className="twin-muted text-sm">{t("login.signingIn")}</p>
          </Card>
        </Shell>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
