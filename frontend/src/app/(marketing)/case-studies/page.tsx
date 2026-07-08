"use client";

import Link from "next/link";

import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { useTranslation } from "@/components/language-provider";
import { MARK_ILLUSTRATIVE_SOCIAL_PROOF } from "@/lib/product-polish-p4";
import { Card, Shell } from "@/components/ui";

export default function CaseStudiesPage() {
  const { t } = useTranslation();

  const cases = [
    { title: t("site.case1Title"), body: t("site.case1Body") },
    { title: t("site.case2Title"), body: t("site.case2Body") },
    { title: t("site.case3Title"), body: t("site.case3Body") },
  ];

  return (
    <Shell wide>
      <MarketingPageSurface>
        <MarketingPageHeader title={t("site.casesTitle")} lead={t("site.casesLead")}>
          {MARK_ILLUSTRATIVE_SOCIAL_PROOF ? (
            <p className="text-sm font-medium text-[var(--twin-muted-strong)]">
              <span className="mr-2 rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--twin-muted)]">
                {t("productPolish.founderLedExamplesBadge")}
              </span>
              {t("site.casesDisclaimer")}
            </p>
          ) : null}
        </MarketingPageHeader>
        <div className="mt-8 space-y-5">
          {cases.map((c) => (
            <Card key={c.title}>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{c.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">{c.body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-[var(--twin-muted-strong)]">
          <Link href="/calculator" className="twin-link font-medium">
            {t("nav.calculator")}
          </Link>
          {" · "}
          <Link href="/contact" className="twin-link font-medium">
            {t("nav.contact")}
          </Link>
        </p>
      </MarketingPageSurface>
    </Shell>
  );
}
