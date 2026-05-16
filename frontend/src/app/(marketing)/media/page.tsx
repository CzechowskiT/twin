"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function MediaPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <article className="twin-prose mx-auto max-w-3xl py-10 sm:py-14">
        <h1>{t("site.mediaTitle")}</h1>
        <p className="lead text-[var(--twin-muted-strong)]">{t("site.mediaLead")}</p>
        <h2>{t("site.mediaKitTitle")}</h2>
        <p>{t("site.mediaKitBody")}</p>
        <h2>{t("site.mediaCoverageTitle")}</h2>
        <p>{t("site.mediaCoverageBody")}</p>
        <p className="text-sm text-[var(--twin-muted)]">
          <Link href="/contact" className="twin-link font-medium">
            {t("nav.contact")}
          </Link>
        </p>
      </article>
    </Shell>
  );
}
