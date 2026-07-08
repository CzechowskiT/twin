"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { useTranslation } from "@/components/language-provider";

const PersonaMarketingPage = dynamic(
  () =>
    import("@/components/marketing/persona-marketing-page").then((m) => m.PersonaMarketingPage),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse px-4 py-16 sm:px-6">
        <div className="mx-auto h-8 max-w-xl rounded bg-[var(--twin-surface-soft)]" />
        <div className="mx-auto mt-4 h-4 max-w-2xl rounded bg-[var(--twin-surface-soft)]" />
      </div>
    ),
  },
);

export default function ForCompaniesPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PersonaMarketingPage persona="companies" />
      <section className="border-t border-[var(--twin-border)] py-10 text-center sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm text-[var(--twin-muted-strong)]">
            <Link href="/company/dashboard" className="twin-link font-semibold text-[var(--foreground)]">
              {t("companyEntry.footerDashboard")}
            </Link>
            <span className="mx-2 text-[var(--twin-border)]">·</span>
            <Link href="/company/talent-pool" className="twin-link font-semibold text-[var(--foreground)]">
              {t("companyTalentPool.navLink")}
            </Link>
            <span className="mx-2 text-[var(--twin-border)]">·</span>
            <Link href="/company/pipeline" className="twin-link font-semibold text-[var(--foreground)]">
              {t("companyPipeline.navLink")}
            </Link>
            <span className="mx-2 text-[var(--twin-border)]">·</span>
            <Link href="/companies/signup" className="twin-link font-semibold text-[var(--foreground)]">
              {t("site.companySignupTitle")}
            </Link>
            <span className="mx-2 text-[var(--twin-border)]">·</span>
            <Link href="/testimonials" className="twin-link font-semibold text-[var(--foreground)]">
              {t("nav.testimonialsIllustrative")}
            </Link>
            <span className="mx-2 text-[var(--twin-border)]">·</span>
            <Link href="/compare/agencies" className="twin-link font-semibold text-[var(--foreground)]">
              {t("site.companySignupCompareAgencies")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
