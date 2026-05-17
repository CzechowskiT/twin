"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button } from "@/components/ui";
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

const REQUIRED_CONSENT_NAMES = [
  "accept_privacy_policy",
  "accept_terms_of_service",
  "accept_job_data_processing",
  "accept_ai_matching",
] as const;

function setRequiredConsentCheckboxes(form: HTMLFormElement, checked: boolean) {
  for (const name of REQUIRED_CONSENT_NAMES) {
    const el = form.elements.namedItem(name);
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      el.checked = checked;
    } else if (el instanceof RadioNodeList) {
      for (const node of Array.from(el)) {
        if (node instanceof HTMLInputElement && node.type === "checkbox") node.checked = checked;
      }
    }
  }
}

type PostLoginCoreConsentFormProps = {
  nextPath: string;
};

/** Logged-in users only: POST `/api/v1/auth/gdpr-consent` (same contract as legacy `/consent/gdpr`). */
export function PostLoginCoreConsentForm({ nextPath }: PostLoginCoreConsentFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkAllRequired = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    setRequiredConsentCheckboxes(form, true);
    setError(null);
  }, []);

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
      const marketing = isConsentCheckboxChecked(formEl, "marketing_emails_opt_in");
      const updated = await apiFetch<AuthMeCoreConsents & { id?: number; email?: string }>(
        "/api/v1/auth/gdpr-consent",
        {
          method: "POST",
          body: JSON.stringify({
            accept_privacy_policy: true,
            accept_terms_of_service: true,
            accept_job_data_processing: true,
            accept_ai_matching: true,
            marketing_emails_opt_in: marketing,
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
    <form ref={formRef} onSubmit={onSubmit}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          className="twin-btn-secondary twin-touch-target !w-auto max-w-full sm:max-w-none"
          disabled={loading}
          onClick={checkAllRequired}
        >
          {t("consentGdpr.checkAllRequired")}
        </Button>
        <p className="text-xs text-[var(--twin-muted-strong)] sm:max-w-md">{t("consentGdpr.checkAllRequiredHint")}</p>
      </div>
      <label className="mb-4 flex items-start gap-2 text-sm">
        <input name="accept_privacy_policy" type="checkbox" value="on" required className="mt-1" />
        <span>
          {t("consentGdpr.checkboxPrivacyBefore")}{" "}
          <Link href="/privacy" className="twin-link underline" target="_blank">
            {t("consentGdpr.privacyLink")}
          </Link>{" "}
          {t("consentGdpr.checkboxPrivacyAfter")}
        </span>
      </label>
      <label className="mb-4 flex items-start gap-2 text-sm">
        <input name="accept_terms_of_service" type="checkbox" value="on" required className="mt-1" />
        <span>
          {t("consentGdpr.checkboxTermsBefore")}{" "}
          <Link href="/terms" className="twin-link underline" target="_blank" rel="noopener noreferrer">
            {t("consentGdpr.termsLink")}
          </Link>{" "}
          {t("consentGdpr.checkboxTermsAfter")}
        </span>
      </label>
      <label className="mb-4 flex items-start gap-2 text-sm">
        <input name="accept_job_data_processing" type="checkbox" value="on" required className="mt-1" />
        <span>
          {t("consentGdpr.checkboxJobDataBefore")}{" "}
          <Link href="/privacy" className="twin-link underline" target="_blank">
            {t("consentGdpr.privacyLink")}
          </Link>{" "}
          {t("consentGdpr.checkboxJobDataAfter")}
        </span>
      </label>
      <label className="mb-4 flex items-start gap-2 text-sm">
        <input name="accept_ai_matching" type="checkbox" value="on" required className="mt-1" />
        <span>
          {t("consentGdpr.checkboxAiBefore")}{" "}
          <Link href="/privacy" className="twin-link underline" target="_blank">
            {t("consentGdpr.privacyLink")}
          </Link>{" "}
          {t("consentGdpr.checkboxAiAfter")}
        </span>
      </label>
      <label className="mb-6 flex items-start gap-2 text-sm">
        <input name="marketing_emails_opt_in" type="checkbox" value="on" className="mt-1" />
        <span>
          <span className="font-medium text-[var(--foreground)]">{t("consentGdpr.marketingOptIn")}</span>
          <span className="mt-1 block text-xs text-[var(--twin-muted-strong)]">{t("consentGdpr.marketingHint")}</span>
        </span>
      </label>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? t("consentGdpr.submitting") : t("consentGdpr.submit")}
      </Button>
    </form>
  );
}
