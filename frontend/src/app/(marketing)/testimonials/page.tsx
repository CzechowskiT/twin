"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { MarketingSectionCtas } from "@/components/marketing/marketing-section-ctas";
import { Card, Shell } from "@/components/ui";

const QUOTE_KEYS = [
  { quote: "site.testimonial1Quote", name: "site.testimonial1Name", detail: "site.testimonial1Detail" },
  { quote: "site.testimonial2Quote", name: "site.testimonial2Name", detail: "site.testimonial2Detail" },
  { quote: "site.testimonial3Quote", name: "site.testimonial3Name", detail: "site.testimonial3Detail" },
  { quote: "site.testimonial4Quote", name: "site.testimonial4Name", detail: "site.testimonial4Detail" },
] as const;

export default function TestimonialsPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <MarketingPageSurface wide>
        <MarketingPageHeader title={t("site.testimonialsTitle")} lead={t("site.testimonialsLead")}>
          <p className="text-sm italic text-[var(--twin-muted-strong)]">{t("site.testimonialsDisclaimer")}</p>
          <MarketingSectionCtas
            primaryHref="/waitlist"
            primaryLabel={t("home.joinWishlist")}
            secondaryHref="/companies/signup"
            secondaryLabel={t("site.companySignupTitle")}
          />
        </MarketingPageHeader>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {QUOTE_KEYS.map((q) => (
            <Card key={q.quote} className="!p-5 sm:!p-6">
              <blockquote className="text-sm leading-relaxed text-[var(--foreground)]">
                &ldquo;{t(q.quote)}&rdquo;
              </blockquote>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--twin-accent)]">
                {t(q.name)}
              </p>
              <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{t(q.detail)}</p>
            </Card>
          ))}
        </div>
        <p className="mt-12 text-center text-sm text-[var(--twin-muted-strong)]">
          <Link href="/companies/signup" className="twin-link font-medium">
            {t("site.companySignupTitle")}
          </Link>
          {" · "}
          <Link href="/compare/linkedin" className="twin-link font-medium">
            TWIN vs LinkedIn
          </Link>
          {" · "}
          <Link href="/for-candidates" className="twin-link font-medium">
            {t("nav.forCandidates")}
          </Link>
        </p>
      </MarketingPageSurface>
    </Shell>
  );
}
