"use client";

import { useTranslation } from "@/components/language-provider";
import { useMvpStats } from "@/lib/use-mvp-stats";
import { countVerifiedPortals } from "@/lib/investor-roadmap";

const LIVE_ROADMAP_COUNT = countVerifiedPortals();

/** Honest scrape coverage line — registry count from API, roadmap live badges from static map. */
export function ScrapeRegistryCoverageHint() {
  const { t } = useTranslation();
  const { data, loading } = useMvpStats();
  const boards = data?.job_boards_in_registry;

  if (loading && boards == null) return null;

  const registry = boards ?? 0;
  return (
    <p className="twin-muted mt-2 break-words text-[11px] leading-relaxed">
      {t("dashboard.scrapeRegistryHonest")
        .replace("{registry}", String(registry))
        .replace("{roadmapLive}", String(LIVE_ROADMAP_COUNT))}
    </p>
  );
}
