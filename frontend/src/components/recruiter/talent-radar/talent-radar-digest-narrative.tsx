"use client";

import { useTranslation } from "@/components/language-provider";
import { RECRUITER_TALENT_RADAR_DIGEST_MARKERS } from "@/lib/recruiter-talent-radar-digest";

export function TalentRadarDigestNarrative({ narrative }: { narrative: string }) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl border border-[var(--twin-accent)]/25 bg-[var(--twin-surface-raised)] p-5"
      data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.narrative}
    >
      <h2 className="text-sm font-semibold text-[var(--foreground)]">
        {t("recruiterTalentRadarDigest.narrativeTitle")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{narrative}</p>
      <p className="mt-3 text-xs text-[var(--twin-muted-strong)]">{t("recruiterTalentRadarDigest.digestNotSent")}</p>
    </div>
  );
}
