"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const token = searchParams.get("token")?.trim() ?? "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError(t("resetPassword.missingToken"));
      return;
    }
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("password_confirm") ?? "");
    if (password !== confirm) {
      setError(t("resetPassword.mismatch"));
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("resetPassword.failed"));
    } finally {
      setLoading(false);
    }
  }

  if (!token && !done) {
    return (
      <Shell>
        <Card>
          <h1 className="mb-4 text-2xl font-semibold">{t("resetPassword.title")}</h1>
          <p className="twin-muted mb-4 text-sm">{t("resetPassword.missingToken")}</p>
          <Link href="/forgot-password" className="twin-link text-sm">
            {t("forgotPassword.title")}
          </Link>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <h1 className="mb-6 text-2xl font-semibold">{t("resetPassword.title")}</h1>
        {done ? (
          <div className="space-y-4">
            <p className="twin-text-success text-sm">{t("resetPassword.success")}</p>
            <Link href="/login" className="twin-link inline-block text-sm">
              {t("resetPassword.backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <Label>{t("resetPassword.password")}</Label>
            <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
            <Label>{t("resetPassword.passwordConfirm")}</Label>
            <Input
              name="password_confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-4">
              {loading ? t("resetPassword.updating") : t("resetPassword.submit")}
            </Button>
          </form>
        )}
        {!done && (
          <p className="twin-muted mt-4 text-center text-sm">
            <Link href="/login" className="twin-link">
              {t("resetPassword.backToLogin")}
            </Link>
          </p>
        )}
      </Card>
    </Shell>
  );
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <Shell>
          <Card>
            <p className="twin-muted text-sm">{t("resetPassword.updating")}</p>
          </Card>
        </Shell>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
