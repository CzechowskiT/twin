"use client";

import { useState } from "react";
import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";

export default function CompanySignupPage() {
  const { t } = useTranslation();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      await apiFetch<{ id: number }>(
        "/api/v1/employers/employer-leads",
        {
          method: "POST",
          body: JSON.stringify({
            company_name: companyName.trim(),
            email: email.trim(),
            contact_name: contactName.trim() || undefined,
            message: message.trim() || undefined,
            source: "companies_signup",
          }),
        },
        null,
      );
      setStatus("ok");
      setCompanyName("");
      setEmail("");
      setContactName("");
      setMessage("");
    } catch (err) {
      setStatus("err");
      setError(err instanceof Error ? err.message : t("site.companySignupFailed"));
    }
  }

  return (
    <Shell wide>
      <MarketingPageSurface wide>
        <MarketingPageHeader title={t("site.companySignupTitle")} lead={t("site.companySignupLead")} />
        <article className="twin-prose twin-prose--solid mt-8 max-w-none">
          {status === "ok" ? (
            <p className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-accent-muted)]/50 px-4 py-3 text-sm text-[var(--foreground)]">
              {t("site.companySignupThanks")}
            </p>
          ) : null}
          <form onSubmit={onSubmit} className="not-prose mt-8 max-w-xl space-y-5">
            <div>
              <label htmlFor="co-name" className="block text-sm font-medium text-[var(--foreground)]">
                {t("site.companySignupCompanyLabel")}
              </label>
              <input
                id="co-name"
                name="company_name"
                required
                minLength={1}
                maxLength={255}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm outline-none ring-[var(--twin-accent)] focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="co-email" className="block text-sm font-medium text-[var(--foreground)]">
                {t("site.companySignupEmailLabel")}
              </label>
              <input
                id="co-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm outline-none ring-[var(--twin-accent)] focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="co-contact" className="block text-sm font-medium text-[var(--foreground)]">
                {t("site.companySignupContactLabel")}
              </label>
              <input
                id="co-contact"
                name="contact_name"
                maxLength={200}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm outline-none ring-[var(--twin-accent)] focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="co-msg" className="block text-sm font-medium text-[var(--foreground)]">
                {t("site.companySignupMessageLabel")}
              </label>
              <textarea
                id="co-msg"
                name="message"
                rows={4}
                maxLength={5000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm outline-none ring-[var(--twin-accent)] focus:ring-2"
                placeholder={t("site.companySignupMessagePlaceholder")}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={status === "loading"}
              className="marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-[var(--twin-cta)] px-6 text-sm font-semibold text-[var(--twin-on-cta)] transition hover:bg-[var(--twin-cta-hover)] disabled:opacity-60"
            >
              {status === "loading" ? t("site.companySignupSending") : t("site.companySignupSubmit")}
            </button>
          </form>
          <p className="mt-10 text-center text-sm text-[var(--twin-muted-strong)]">
            <Link href="/for-companies" className="twin-link font-medium">
              {t("site.companySignupBackCompanies")}
            </Link>
            {" · "}
            <Link href="/compare/agencies" className="twin-link font-medium">
              {t("site.companySignupCompareAgencies")}
            </Link>
          </p>
        </article>
      </MarketingPageSurface>
    </Shell>
  );
}
