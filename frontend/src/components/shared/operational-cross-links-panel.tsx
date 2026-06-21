"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { OPERATIONAL_CROSS_LINKS, OPERATIONAL_CROSS_LINKS_MARKER } from "@/lib/operational-cross-links";

export function OperationalCrossLinksPanel(): ReactNode {
  const { t } = useTranslation();

  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
      <nav data-testid={OPERATIONAL_CROSS_LINKS_MARKER} aria-label={t("liveOperatingState.crossLinksTitle")}>
        <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
          {t("liveOperatingState.crossLinksTitle")}
        </h2>
        <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("liveOperatingState.crossLinksLead")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {OPERATIONAL_CROSS_LINKS.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className="rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs font-medium transition hover:border-[var(--twin-accent)]/40"
              data-testid={`operational-cross-link-${link.id}`}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </div>
      </nav>
    </Card>
  );
}
