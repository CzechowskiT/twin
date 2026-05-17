"use client";

import Link from "next/link";

import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

export default function PartnersPage() {
  const { t } = useTranslation();

  const blocks = [
    {
      id: "partners-references",
      title: t("site.partnersReferencesTitle"),
      lead: t("site.partnersReferencesLead"),
      placeholder: t("site.partnersReferencesPlaceholder"),
    },
    {
      id: "partners-use-cases",
      title: t("site.partnersUseCasesTitle"),
      lead: t("site.partnersUseCasesLead"),
      placeholder: t("site.partnersUseCasesPlaceholder"),
    },
    {
      id: "partners-testimonials",
      title: t("site.partnersTestimonialsTitle"),
      lead: t("site.partnersTestimonialsLead"),
      placeholder: t("site.partnersTestimonialsPlaceholder"),
    },
  ] as const;

  return (
    <Shell wide>
      <MarketingPageSurface>
        <article className="twin-prose twin-prose--solid max-w-none">
          <h1>{t("site.partnersTitle")}</h1>
          <p className="lead">{t("site.partnersLead")}</p>
          <p>{t("site.partnersBody")}</p>
          <p className="text-sm italic text-[var(--twin-muted-strong)]">{t("site.partnersNote")}</p>
          <p className="text-sm text-[var(--twin-muted-strong)]">
            <Link href="/contact" className="twin-link font-medium">
              {t("nav.contact")}
            </Link>
          </p>
        </article>

        <div className="mt-12 space-y-12">
          {blocks.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2
                id={section.id}
                className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl"
              >
                {section.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
                {section.lead}
              </p>
              <Card className="mt-4">
                <p className="text-sm italic leading-relaxed text-[var(--twin-muted-strong)]">
                  {section.placeholder}
                </p>
              </Card>
            </section>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-[var(--twin-muted-strong)]">
          <Link href="/case-studies" className="twin-link font-medium">
            {t("nav.cases")}
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
