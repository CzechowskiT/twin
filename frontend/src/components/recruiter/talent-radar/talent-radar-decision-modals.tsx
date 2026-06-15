"use client";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  TALENT_RADAR_DISMISS_REASON_CODES,
  TALENT_RADAR_DECISION_MARKERS,
  TALENT_RADAR_SNOOZE_DAYS,
  type TalentRadarDismissReasonCode,
  type TalentRadarSnoozeDays,
} from "@/lib/recruiter-talent-radar-decisions";
import { Card } from "@/components/ui";

export function TalentRadarSnoozeModal({
  open,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (days: TalentRadarSnoozeDays) => void;
  saving?: boolean;
}) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card
        variant="soft"
        className="w-full max-w-md p-5"
        data-testid={TALENT_RADAR_DECISION_MARKERS.snoozeModal}
      >
        <p className="text-sm font-semibold">{t("recruiterTalentRadar.snoozeModalTitle")}</p>
        <p className="twin-muted mt-1 text-xs">{t("recruiterTalentRadar.snoozeModalBody")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TALENT_RADAR_SNOOZE_DAYS.map((days) => (
            <button
              key={days}
              type="button"
              className="twin-btn-ghost text-sm"
              disabled={saving}
              onClick={() => onConfirm(days)}
            >
              {t(`recruiterTalentRadar.snoozeDays_${days}` as TranslationKey)}
            </button>
          ))}
        </div>
        <button type="button" className="twin-btn-ghost mt-4 text-sm" onClick={onClose} disabled={saving}>
          {t("recruiterTalentRadar.modalCancel")}
        </button>
      </Card>
    </div>
  );
}

export function TalentRadarDismissModal({
  open,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: TalentRadarDismissReasonCode) => void;
  saving?: boolean;
}) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card
        variant="soft"
        className="w-full max-w-md p-5"
        data-testid={TALENT_RADAR_DECISION_MARKERS.dismissModal}
      >
        <p className="text-sm font-semibold">{t("recruiterTalentRadar.dismissModalTitle")}</p>
        <p className="twin-muted mt-1 text-xs">{t("recruiterTalentRadar.dismissModalBody")}</p>
        <div className="mt-4 space-y-2">
          {TALENT_RADAR_DISMISS_REASON_CODES.map((code) => (
            <button
              key={code}
              type="button"
              className="block w-full rounded-lg border border-[var(--twin-border)] px-3 py-2 text-left text-sm hover:border-[var(--twin-accent)]/40"
              disabled={saving}
              onClick={() => onConfirm(code)}
            >
              {t(`recruiterTalentRadar.dismissReason_${code}` as TranslationKey)}
            </button>
          ))}
        </div>
        <button type="button" className="twin-btn-ghost mt-4 text-sm" onClick={onClose} disabled={saving}>
          {t("recruiterTalentRadar.modalCancel")}
        </button>
      </Card>
    </div>
  );
}
