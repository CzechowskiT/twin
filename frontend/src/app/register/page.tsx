"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";

type TokenResponse = { access_token: string };

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const gdpr = form.get("gdpr") === "on";
    if (!gdpr) {
      setError(t("register.gdprRequired"));
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
    <Shell>
      <Card>
        <h1 className="mb-6 text-2xl font-semibold">{t("register.title")}</h1>
        <form onSubmit={onSubmit}>
          <Label>{t("register.email")}</Label>
          <Input name="email" type="email" required autoComplete="email" />
          <Label>{t("register.password")}</Label>
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
          <label className="mb-6 flex items-start gap-2 text-sm">
            <input name="gdpr" type="checkbox" className="mt-1" required />
            <span>
              {t("register.gdprBefore")}{" "}
              <Link href="/privacy" className="twin-link underline" target="_blank">
                {t("register.privacyPolicy")}
              </Link>{" "}
              {t("register.gdprAfter")}
            </span>
          </label>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? t("register.creating") : t("register.submit")}
          </Button>
        </form>
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
