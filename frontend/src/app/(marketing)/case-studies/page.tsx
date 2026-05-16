"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
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
      <div className="mx-auto max-w-3xl py-10 sm:py-14">
        <article className="twin-prose max-w-none">
          <h1>{t("site.casesTitle")}</h1>
          <p className="lead text-[var(--twin-muted-strong)]">{t("site.casesLead")}</p>
        </article>
        <div className="mt-8 space-y-5">
          {cases.map((c) => (
            <Card key={c.title}>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{c.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted)]">{c.body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-[var(--twin-muted)]">
          <Link href="/calculator" className="twin-link font-medium">
            {t("nav.calculator")}
          </Link>
          {" · "}
          <Link href="/contact" className="twin-link font-medium">
            {t("nav.contact")}
          </Link>
        </p>
      </div>
    </Shell>
  );
}
