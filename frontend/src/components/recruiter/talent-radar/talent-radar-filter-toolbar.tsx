"use client";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  TALENT_RADAR_SEGMENTS,
  TALENT_RADAR_SIGNALS,
  TALENT_RADAR_TIMING,
  type TalentRadarFilters,
} from "@/lib/recruiter-talent-radar";
import { talentRadarFilterToolbarClass } from "@/lib/recruiter-talent-radar-visual";

type RoleOption = { id: number; title: string };

export function TalentRadarFilterToolbar({
  filters,
  roles,
  onChange,
}: {
  filters: TalentRadarFilters;
  roles: RoleOption[];
  onChange: <K extends keyof TalentRadarFilters>(key: K, value: TalentRadarFilters[K]) => void;
}) {
  const { t } = useTranslation();

  const selectClass =
    "mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-2 text-sm";

  return (
    <div className={talentRadarFilterToolbarClass()}>
      <p className="text-sm font-semibold text-[var(--foreground)]">
        {t("recruiterTalentRadar.filterToolbarTitle")}
      </p>
      <p className="twin-muted mt-1 text-xs leading-relaxed">{t("recruiterTalentRadar.filterToolbarHelper")}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">{t("recruiterTalentRadar.filterRole")}</span>
          <select
            className={selectClass}
            value={filters.roleId}
            onChange={(e) => onChange("roleId", e.target.value)}
          >
            <option value="">{t("recruiterTalentRadar.filterAllRoles")}</option>
            {roles.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("recruiterTalentRadar.filterSegment")}</span>
          <select
            className={selectClass}
            value={filters.segment}
            onChange={(e) => onChange("segment", e.target.value as TalentRadarFilters["segment"])}
          >
            {TALENT_RADAR_SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {t(`recruiterTalentRadar.segment_${s}` as TranslationKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("recruiterTalentRadar.filterTiming")}</span>
          <select
            className={selectClass}
            value={filters.timingWindow}
            onChange={(e) => onChange("timingWindow", e.target.value as TalentRadarFilters["timingWindow"])}
          >
            {TALENT_RADAR_TIMING.map((tw) => (
              <option key={tw} value={tw}>
                {t(`recruiterTalentRadar.timing_${tw}` as TranslationKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("recruiterTalentRadar.filterSignal")}</span>
          <select
            className={selectClass}
            value={filters.signalType}
            onChange={(e) => onChange("signalType", e.target.value as TalentRadarFilters["signalType"])}
          >
            {TALENT_RADAR_SIGNALS.map((sig) => (
              <option key={sig} value={sig}>
                {t(`recruiterTalentRadar.signal_${sig}` as TranslationKey)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
