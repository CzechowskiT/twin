"use client";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

const LEVEL_KEYS: Record<string, TranslationKey> = {
  intern: "jobBoard.seniorityIntern",
  junior: "jobBoard.seniorityJunior",
  mid: "jobBoard.seniorityMid",
  senior: "jobBoard.senioritySenior",
  lead: "jobBoard.seniorityLead",
  director: "jobBoard.seniorityDirector",
};

export function SeniorityBadge({ level }: { level: string | null | undefined }) {
  const { t } = useTranslation();
  if (!level) return null;
  const key = LEVEL_KEYS[level.toLowerCase()];
  if (!key) return null;
  return <span className="twin-badge twin-badge--match text-xs font-medium">{t(key)}</span>;
}
