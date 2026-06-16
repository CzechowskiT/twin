"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import {
  COMPANY_ENTRY_MARKERS,
  COMPANY_ENTRY_PREVIEW_CARDS,
} from "@/lib/company-entry-navigation";

export function CompanyWorkspacePreview() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="company-workspace-preview-heading"
      className="text-start"
      data-testid={COMPANY_ENTRY_MARKERS.workspacePreview}
    >
      <h2 id="company-workspace-preview-heading" className="twin-section-title text-lg sm:text-xl">
        {t("companyEntry.workspacePreviewTitle")}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
        {t("companyEntry.workspacePreviewLead")}
      </p>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2">
        {COMPANY_ENTRY_PREVIEW_CARDS.map((card) => (
          <li
            key={card.id}
            className="flex min-h-0 flex-col rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/90 p-5 sm:p-6"
            data-testid={card.marker}
          >
            <h3 className="text-base font-semibold text-[var(--foreground)]">{t(card.titleKey)}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
              {t(card.descKey)}
            </p>
            <Link
              href={card.href}
              className="section-cta-secondary twin-touch-target mt-6 w-full sm:w-auto"
            >
              {t(card.ctaKey)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
