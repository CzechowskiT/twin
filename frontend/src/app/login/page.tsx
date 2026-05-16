"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { LinkedInLoginButton } from "@/components/linkedin-login-button";
import { LinkedInSetupHint } from "@/components/linkedin-setup-hint";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { fetchLinkedInAuthStatus } from "@/lib/linkedin-auth";

type TokenResponse = { access_token: string };

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkedInConfigured, setLinkedInConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetchLinkedInAuthStatus()
      .then((status) => setLinkedInConfigured(status.configured))
      .catch(() => setLinkedInConfigured(false));
  }, []);

  useEffect(() => {
    if (searchParams.get("error") === "linkedin_not_configured") {
      setError(t("login.errorLinkedinNotConfigured"));
    }
  }, [searchParams, t]);

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
      setError(err instanceof Error ? err.message : t("login.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Card>
        <h1 className="mb-6 text-2xl font-semibold">{t("login.title")}</h1>
        <form onSubmit={onSubmit}>
          <Label>{t("login.email")}</Label>
          <Input name="email" type="email" required autoComplete="email" />
          <Label>{t("login.password")}</Label>
          <Input name="password" type="password" required autoComplete="current-password" />
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? t("login.signingIn") : t("login.submit")}
          </Button>
        </form>
        {linkedInConfigured !== null && (
          <>
            <p className="twin-muted my-4 text-center text-xs uppercase tracking-wide">
              {t("login.orContinue")}
            </p>
            {!linkedInConfigured && <LinkedInSetupHint />}
            <LinkedInLoginButton
              label={t("login.linkedIn")}
              configured={linkedInConfigured}
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
        <Shell>
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
