"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function PartnersPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <article className="twin-prose mx-auto max-w-3xl py-10 sm:py-14">
        <h1>{t("site.partnersTitle")}</h1>
        <p className="lead text-[var(--twin-muted-strong)]">{t("site.partnersLead")}</p>
        <p>{t("site.partnersBody")}</p>
        <p className="text-sm italic text-[var(--twin-muted)]">{t("site.partnersNote")}</p>
        <p className="text-sm text-[var(--twin-muted)]">
          <Link href="/contact" className="twin-link font-medium">
            {t("nav.contact")}
          </Link>
        </p>
      </article>
    </Shell>
  );
}
