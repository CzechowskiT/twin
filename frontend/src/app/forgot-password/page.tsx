"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { fetchOpsHealth } from "@/lib/ops-health";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [mailConfigured, setMailConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchOpsHealth().then((ops) => {
      if (ops) setMailConfigured(ops.mail_configured);
    });
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email") }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("resetPassword.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell rail>
      <Card>
        <h1 className="mb-6 text-2xl font-semibold">{t("forgotPassword.title")}</h1>
        {sent ? (
          <div className="space-y-4">
            <p className="font-medium">{t("forgotPassword.sentTitle")}</p>
            <p className="twin-muted text-sm">{t("forgotPassword.sentBody")}</p>
            {mailConfigured === false ? (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{t("forgotPassword.mailNotConfiguredHint")}</p>
            ) : null}
            <Link href="/login" className="twin-link inline-block text-sm">
              {t("forgotPassword.backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <Label>{t("forgotPassword.email")}</Label>
            <Input name="email" type="email" required autoComplete="email" />
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-4">
              {loading ? t("forgotPassword.sending") : t("forgotPassword.submit")}
            </Button>
            <p className="twin-muted mt-4 text-center text-sm">
              <Link href="/login" className="twin-link">
                {t("forgotPassword.backToLogin")}
              </Link>
            </p>
          </form>
        )}
      </Card>
    </Shell>
  );
}
