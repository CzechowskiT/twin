"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";

type TokenResponse = { access_token: string };

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
