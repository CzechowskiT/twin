"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { LegalRegionNotice } from "@/components/legal-region-notice";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { hasCoreConsents, type AuthMeCoreConsents } from "@/lib/core-consents";

function isConsentCheckboxChecked(form: HTMLFormElement, name: string): boolean {
  const el = form.elements.namedItem(name);
  if (el instanceof RadioNodeList) {
    return Array.from(el).some((node) => node instanceof HTMLInputElement && node.checked);
  }
  return el instanceof HTMLInputElement && el.type === "checkbox" && el.checked;
}

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
    const formEl = e.currentTarget;
    const ok =
      isConsentCheckboxChecked(formEl, "accept_privacy_policy") &&
      isConsentCheckboxChecked(formEl, "accept_terms_of_service") &&
      isConsentCheckboxChecked(formEl, "accept_job_data_processing") &&
      isConsentCheckboxChecked(formEl, "accept_ai_matching");
    if (!ok) {
      setError(t("consentGdpr.requiredAll"));
      return;
    }
    setLoading(true);
    try {
      const updated = await apiFetch<AuthMeCoreConsents & { id?: number; email?: string }>(
        "/api/v1/auth/gdpr-consent",
        {
          method: "POST",
          body: JSON.stringify({
            accept_privacy_policy: true,
            accept_terms_of_service: true,
            accept_job_data_processing: true,
            accept_ai_matching: true,
          }),
        },
        token,
      );
      if (!hasCoreConsents(updated)) {
        setError(t("consentGdpr.failedIncomplete"));
        return;
      }
      router.replace(nextPath);
      router.refresh();
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
        <LegalRegionNotice />
        <form onSubmit={onSubmit}>
          <label className="mb-4 flex items-start gap-2 text-sm">
            <input
              name="accept_privacy_policy"
              type="checkbox"
              value="on"
              required
              className="mt-1"
            />
            <span>
              {t("consentGdpr.checkboxPrivacyBefore")}{" "}
              <Link href="/privacy" className="twin-link underline" target="_blank">
                {t("consentGdpr.privacyLink")}
              </Link>
              {t("consentGdpr.checkboxPrivacyAfter")}
            </span>
          </label>
          <label className="mb-4 flex items-start gap-2 text-sm">
            <input
              name="accept_terms_of_service"
              type="checkbox"
              value="on"
              required
              className="mt-1"
            />
            <span>
              {t("consentGdpr.checkboxTermsBefore")}{" "}
              <Link href="/terms" className="twin-link underline" target="_blank" rel="noopener noreferrer">
                {t("consentGdpr.termsLink")}
              </Link>
              {t("consentGdpr.checkboxTermsAfter")}
            </span>
          </label>
          <label className="mb-4 flex items-start gap-2 text-sm">
            <input
              name="accept_job_data_processing"
              type="checkbox"
              value="on"
              required
              className="mt-1"
            />
            <span>
              {t("consentGdpr.checkboxJobDataBefore")}{" "}
              <Link href="/privacy" className="twin-link underline" target="_blank">
                {t("consentGdpr.privacyLink")}
              </Link>
              {t("consentGdpr.checkboxJobDataAfter")}
            </span>
          </label>
          <label className="mb-6 flex items-start gap-2 text-sm">
            <input name="accept_ai_matching" type="checkbox" value="on" required className="mt-1" />
            <span>
              {t("consentGdpr.checkboxAiBefore")}{" "}
              <Link href="/privacy" className="twin-link underline" target="_blank">
                {t("consentGdpr.privacyLink")}
              </Link>
              {t("consentGdpr.checkboxAiAfter")}
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
