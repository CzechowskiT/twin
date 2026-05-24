"use client";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

const DEMO_CANDIDATES = [
  { name: "Alex K.", stage: "new" },
  { name: "Marta W.", stage: "screen" },
  { name: "Jan P.", stage: "interview" },
  { name: "Ewa L.", stage: "offer" },
] as const;

const STAGE_KEYS: Record<string, TranslationKey> = {
  new: "careerDiscovery.miniAtsStageNew",
  screen: "careerDiscovery.miniAtsStageScreen",
  interview: "careerDiscovery.miniAtsStageInterview",
  offer: "careerDiscovery.miniAtsStageOffer",
};

export function MiniAts() {
  const { t } = useTranslation();
  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium">{t("careerDiscovery.miniAtsTitle")}</h2>
      <p className="twin-muted mt-1 text-xs">{t("careerDiscovery.miniAtsLead")}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {DEMO_CANDIDATES.map((c) => (
          <li
            key={c.name}
            className="flex items-center justify-between rounded border border-[var(--twin-border)] px-3 py-2"
          >
            <span>{c.name}</span>
            <span className="twin-badge text-[10px]">{t(STAGE_KEYS[c.stage])}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
