"use client";

import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  RECRUITER_SCHEDULING_VISUAL_MARKERS,
  buildRecruiterInviteMessage,
  defaultManualSlotInput,
  type RecruiterManualSlotInput,
  type RecruiterSchedulingRow,
  type RecruiterSchedulingStatus,
} from "@/lib/recruiter-scheduling";

type Props = {
  row: RecruiterSchedulingRow;
  busy: boolean;
  onSave: (slot: RecruiterManualSlotInput, status: RecruiterSchedulingStatus) => Promise<void>;
  onClose: () => void;
};

export function RecruiterSchedulingPanel({ row, busy, onSave, onClose }: Props) {
  const { t, locale } = useTranslation();
  const [slot, setSlot] = useState<RecruiterManualSlotInput>(() => {
    const base = defaultManualSlotInput();
    if (row.manual_slot_at) {
      const parsed = new Date(row.manual_slot_at);
      if (!Number.isNaN(parsed.getTime())) {
        base.slotDate = parsed.toISOString().slice(0, 10);
        base.slotTime = parsed.toISOString().slice(11, 16);
      }
    }
    if (row.manual_slot_duration_minutes) base.durationMinutes = row.manual_slot_duration_minutes;
    if (row.manual_meeting_link) base.meetingLink = row.manual_meeting_link;
    return base;
  });
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const inviteMessage = useMemo(
    () => buildRecruiterInviteMessage(row, slot, locale),
    [row, slot, locale],
  );

  const slotReady = slot.slotDate.trim().length > 0 && slot.slotTime.trim().length > 0;

  const updateSlot = useCallback((patch: Partial<RecruiterManualSlotInput>) => {
    setSlot((prev) => ({ ...prev, ...patch }));
    setSaveError(null);
  }, []);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function persist(status: RecruiterSchedulingStatus) {
    if (!slotReady) return;
    setSaveError(null);
    try {
      await onSave(slot, status);
      onClose();
    } catch {
      setSaveError(t("recruiterScheduling.saveFailed"));
    }
  }

  return (
    <div
      className={`${RECRUITER_SCHEDULING_VISUAL_MARKERS.panel} mt-3 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/90 p-3 sm:p-4`}
    >
      <p
        className={`${RECRUITER_SCHEDULING_VISUAL_MARKERS.notSyncedBanner} text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400`}
      >
        {t("recruiterScheduling.trustLabel")}
      </p>
      <p className="twin-muted mt-2 text-xs leading-relaxed">{t("recruiterScheduling.manualSchedulingNote")}</p>
      <p
        className={`${RECRUITER_SCHEDULING_VISUAL_MARKERS.notSentBanner} mt-2 text-xs text-[var(--twin-muted-strong)]`}
      >
        {t("recruiterScheduling.notSentDisclaimer")}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-[var(--foreground)]">
          {t("recruiterScheduling.dateLabel")}
          <input
            type="date"
            className={`${RECRUITER_SCHEDULING_VISUAL_MARKERS.slotDate} twin-input mt-1 w-full text-sm`}
            value={slot.slotDate}
            onChange={(e) => updateSlot({ slotDate: e.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-[var(--foreground)]">
          {t("recruiterScheduling.timeLabel")}
          <input
            type="time"
            className={`${RECRUITER_SCHEDULING_VISUAL_MARKERS.slotTime} twin-input mt-1 w-full text-sm`}
            value={slot.slotTime}
            onChange={(e) => updateSlot({ slotTime: e.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-[var(--foreground)]">
          {t("recruiterScheduling.durationLabel")}
          <input
            type="number"
            min={15}
            max={480}
            step={15}
            className={`${RECRUITER_SCHEDULING_VISUAL_MARKERS.slotDuration} twin-input mt-1 w-full text-sm`}
            value={slot.durationMinutes}
            onChange={(e) => updateSlot({ durationMinutes: Number(e.target.value) || 45 })}
          />
        </label>
        <label className="block text-xs font-medium text-[var(--foreground)] sm:col-span-2">
          {t("recruiterScheduling.meetingLinkLabel")}
          <input
            type="url"
            className={`${RECRUITER_SCHEDULING_VISUAL_MARKERS.meetingLink} twin-input mt-1 w-full text-sm`}
            value={slot.meetingLink}
            placeholder={t("recruiterScheduling.meetingLinkPlaceholder")}
            onChange={(e) => updateSlot({ meetingLink: e.target.value })}
          />
        </label>
      </div>

      <label className="mt-4 block text-xs font-medium text-[var(--foreground)]">
        {t("recruiterScheduling.inviteMessageLabel")}
        <textarea
          className="twin-input mt-1 min-h-[9rem] w-full text-sm leading-relaxed"
          readOnly
          value={inviteMessage}
        />
      </label>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          className={`${RECRUITER_SCHEDULING_VISUAL_MARKERS.copyButton} twin-btn-ghost w-full text-sm`}
          disabled={!slotReady}
          onClick={() => void copyInvite()}
        >
          {copied ? t("recruiterScheduling.copied") : t("recruiterScheduling.copyInvite")}
        </button>
        <button
          type="button"
          className="twin-btn-solid w-full text-sm"
          disabled={busy || !slotReady}
          onClick={() => void persist("invited")}
        >
          {busy ? t("common.loadingEllipsis") : t("recruiterScheduling.markInvited")}
        </button>
        <button
          type="button"
          className="twin-btn-solid w-full text-sm"
          disabled={busy || !slotReady}
          onClick={() => void persist("interview_scheduled")}
        >
          {busy ? t("common.loadingEllipsis") : t("recruiterScheduling.markScheduled")}
        </button>
        <button type="button" className="twin-btn-ghost w-full text-sm" onClick={onClose}>
          {t("recruiterScheduling.close")}
        </button>
      </div>

      {saveError ? <p className="mt-2 text-xs text-red-600">{saveError}</p> : null}

      <p
        className={`${RECRUITER_SCHEDULING_VISUAL_MARKERS.calendarSyncNote} twin-muted mt-4 text-xs leading-relaxed`}
      >
        {t("recruiterScheduling.calendarSyncNotLive")}
      </p>
    </div>
  );
}

export function recruiterSchedulingStatusBadgeKey(
  status: string | null | undefined,
): TranslationKey | null {
  if (status === "invited") return "recruiterScheduling.statusInvited";
  if (status === "interview_scheduled") return "recruiterScheduling.statusInterviewScheduled";
  return null;
}
