"use client";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  TALENT_RADAR_DECISION_FILTERS,
  TALENT_RADAR_DECISION_MARKERS,
  type TalentRadarDecisionFilter,
} from "@/lib/recruiter-talent-radar-decisions";
import { talentRadarFilterToolbarClass } from "@/lib/recruiter-talent-radar-visual";

export function TalentRadarDecisionFilterBar({
  value,
  onChange,
}: {
  value: TalentRadarDecisionFilter;
  onChange: (value: TalentRadarDecisionFilter) => void;
}) {
  const { t } = useTranslation();

  const labelKey = (f: TalentRadarDecisionFilter): TranslationKey =>
    `recruiterTalentRadar.decisionFilter_${f}` as TranslationKey;

  return (
    <div
      className={`${talentRadarFilterToolbarClass()} mt-4`}
      data-testid={TALENT_RADAR_DECISION_MARKERS.decisionFilter}
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">
        {t("recruiterTalentRadar.decisionFilterTitle")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {TALENT_RADAR_DECISION_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={
              value === filter
                ? "rounded-full border border-[var(--twin-accent)] bg-[var(--twin-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--twin-accent)]"
                : "rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-1.5 text-xs font-medium text-[var(--twin-muted-strong)] hover:border-[var(--twin-accent)]/40"
            }
            onClick={() => onChange(filter)}
            aria-pressed={value === filter}
          >
            {t(labelKey(filter))}
          </button>
        ))}
      </div>
    </div>
  );
}
