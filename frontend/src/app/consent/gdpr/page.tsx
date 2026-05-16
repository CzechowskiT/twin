"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function ConsentGdprInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextRaw = searchParams.get("next");
  const nextPath = nextRaw?.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const token = getToken();
    if (!token) {
      setError(t("consentGdpr.failed"));
      return;
    }
    const form = new FormData(e.currentTarget);
    if (form.get("gdpr") !== "on") {
      setError(t("consentGdpr.required"));
      return;
    }
    setLoading(true);
    try {
      await apiFetch(
        "/api/v1/auth/gdpr-consent",
        { method: "POST", body: JSON.stringify({ accept_privacy_policy: true }) },
        token,
      );
      router.replace(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("consentGdpr.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell rail>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t("consentGdpr.title")}</h1>
        <p className="twin-muted mb-6 text-sm">{t("consentGdpr.lead")}</p>
        <form onSubmit={onSubmit}>
          <label className="mb-6 flex items-start gap-2 text-sm">
            <input name="gdpr" type="checkbox" className="mt-1" />
            <span>
              {t("consentGdpr.checkboxBefore")}{" "}
              <Link href="/privacy" className="twin-link underline" target="_blank">
                {t("consentGdpr.privacyLink")}
              </Link>{" "}
              {t("consentGdpr.checkboxAfter")}
            </span>
          </label>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? t("consentGdpr.submitting") : t("consentGdpr.submit")}
          </Button>
        </form>
      </Card>
    </Shell>
  );
}

export default function ConsentGdprPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <Shell rail>
          <Card>
            <p className="twin-muted text-sm">{t("consentGdpr.submitting")}</p>
          </Card>
        </Shell>
      }
    >
      <ConsentGdprInner />
    </Suspense>
  );
}
