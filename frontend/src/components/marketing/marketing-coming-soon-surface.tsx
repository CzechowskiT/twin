"use client";

import Link from "next/link";

import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { useTranslation } from "@/components/language-provider";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import { Card, Shell } from "@/components/ui";
import type { ThinMarketingPath } from "@/lib/product-polish-p1";
import type { TranslationKey } from "@/lib/i18n";

const TOPIC_TITLE_KEYS: Record<ThinMarketingPath, TranslationKey> = {
  "/partners": "nav.partners",
  "/careers": "nav.careers",
  "/media": "nav.media",
};

type MarketingComingSoonSurfaceProps = {
  topic: ThinMarketingPath;
};

/** Brief honest placeholder for thin marketing routes — no empty subsection cards. */
export function MarketingComingSoonSurface({ topic }: MarketingComingSoonSurfaceProps) {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <MarketingPageSurface>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <MarketingPageHeader title={t(TOPIC_TITLE_KEYS[topic])} lead={t("productPolish.comingSoonLead")} />
          <WorkspaceStatusBadge status="coming_soon" />
        </div>
        <Card variant="soft" className="mt-8 border-[var(--twin-border)]/80 p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-[var(--foreground)]">{t("productPolish.comingSoonBody")}</p>
          <p className="mt-4 text-sm text-[var(--twin-muted-strong)]">
            <Link href="/contact" className="twin-link font-medium">
              {t("productPolish.comingSoonContact")}
            </Link>
            {" · "}
            <Link href="/" className="twin-link font-medium">
              {t("productPolish.comingSoonHome")}
            </Link>
          </p>
        </Card>
      </MarketingPageSurface>
    </Shell>
  );
}
