"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { calendarProviderLabel } from "@/lib/calendar-provider";
import { detectMeetingProvider, meetingProviderLabelKey } from "@/lib/meeting-link";
import { apiFetchBlob, saveBlobAsFile } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { webcalToHttps } from "@/lib/webcal-subscribe";

import type { DashboardCalendarBundle } from "./dashboard-helpers";
import { formatInterviewRangeShort } from "./dashboard-helpers";

type Props = {
  bundle: DashboardCalendarBundle | null;
  calendarConnectBusy: "google" | "microsoft" | null;
  onConnectGoogle: () => void;
  onConnectMicrosoft: () => void;
  webcalUrl: string | null;
  webcalBusy: boolean;
  onWebcalOneClick: () => void;
  onWebcalRefresh: () => void;
  nextInterviewIcsBusy: boolean;
  setNextInterviewIcsBusy: (v: boolean) => void;
};

/**
 * Dashboard calendar strip: Google/Microsoft connect, next interview hint,
 * WebCal subscribe one-click. Self-contained UI; all network calls flow
 * through callbacks owned by the parent page so behavior is unchanged.
 */
export function DashboardCalendarStrip({
  bundle,
  calendarConnectBusy,
  onConnectGoogle,
  onConnectMicrosoft,
  webcalUrl,
  webcalBusy,
  onWebcalOneClick,
  onWebcalRefresh,
  nextInterviewIcsBusy,
  setNextInterviewIcsBusy,
}: Props) {
  const { t, locale } = useTranslation();

  return (
    <Card variant="soft" className="mb-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--foreground)]">{t("acceptanceQueue.stripTitle")}</p>
        <Link href="/dashboard/acceptance" className="twin-btn-secondary twin-touch-target text-xs">
          {t("acceptanceQueue.stripCta")}
        </Link>
      </div>
      <div className="dashboard-calendar-strip flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.calendarStripTitle")}</p>
          <p className="twin-muted mt-1 text-xs leading-relaxed">
            {bundle === null
              ? t("dashboard.calendarStripLoading")
              : bundle.google.connected
                ? t("dashboard.calendarStripConnected").replace(
                    "{email}",
                    bundle.google.google_email?.trim() || "—",
                  )
                : bundle.google.oauth_configured === false
                  ? t("dashboard.calendarGoogleOAuthNotConfigured")
                  : t("dashboard.calendarStripDisconnected")}
          </p>
          {bundle && !bundle.google.connected && bundle.google.oauth_configured ? (
            <Button
              type="button"
              className="twin-touch-target mt-3 !w-auto"
              disabled={calendarConnectBusy !== null}
              onClick={onConnectGoogle}
            >
              {calendarConnectBusy === "google" ? "…" : t("dashboard.calendarStripConnectGoogle")}
            </Button>
          ) : null}
          {bundle ? (
            <div className="mt-3 border-t border-[var(--twin-border)] pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
                {t("dashboard.calendarStripMicrosoftEyebrow")}
              </p>
              <p className="twin-muted mt-1 text-xs leading-relaxed">
                {bundle.microsoft.connected
                  ? t("dashboard.calendarStripMicrosoftConnected").replace(
                      "{email}",
                      bundle.microsoft.microsoft_email?.trim() || "—",
                    )
                  : bundle.microsoft.oauth_configured === false
                    ? t("dashboard.calendarMicrosoftOAuthNotConfigured")
                    : t("dashboard.calendarStripMicrosoftDisconnected")}
              </p>
              {!bundle.microsoft.connected && bundle.microsoft.oauth_configured ? (
                <Button
                  type="button"
                  className="twin-touch-target mt-2 !w-auto"
                  disabled={calendarConnectBusy !== null}
                  onClick={onConnectMicrosoft}
                >
                  {calendarConnectBusy === "microsoft" ? "…" : t("dashboard.calendarStripConnectMicrosoft")}
                </Button>
              ) : null}
            </div>
          ) : null}
          {bundle && (bundle.nextInterview || bundle.google.connected || bundle.microsoft.connected) ? (
            <div className="calendar-next-block mt-3 border-t border-[var(--twin-border)] pt-3 sm:border-t-0 sm:pt-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
                {t("dashboard.calendarNextInterviewTitle")}
              </p>
              {bundle.nextInterview ? (
                <>
                  <p className="mt-1.5 text-sm font-medium text-[var(--foreground)]">
                    {bundle.nextInterview.job_title}
                    <span className="font-normal text-[var(--twin-muted-strong)]">
                      {" "}
                      · {bundle.nextInterview.company_name}
                    </span>
                  </p>
                  <p className="twin-muted mt-0.5 text-xs">
                    {formatInterviewRangeShort(
                      bundle.nextInterview.interview_start,
                      bundle.nextInterview.interview_end,
                      locale,
                    )}
                    {bundle.nextInterview.calendar_provider ? (
                      <span className="ml-1 text-[var(--twin-muted-strong)]">
                        · {calendarProviderLabel(bundle.nextInterview.calendar_provider, t)}
                      </span>
                    ) : null}
                  </p>
                  {bundle.nextInterview.meeting_link?.trim() ? (
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      {(() => {
                        const prov = detectMeetingProvider(bundle.nextInterview.meeting_link);
                        const labelKey = meetingProviderLabelKey(prov);
                        return labelKey ? (
                          <span className="rounded bg-[var(--twin-surface-raised)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                            {t(labelKey)}
                          </span>
                        ) : null;
                      })()}
                      <a
                        href={bundle.nextInterview.meeting_link.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="twin-link text-xs font-medium"
                      >
                        {t("dashboard.calendarNextInterviewJoinLink")}
                      </a>
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={nextInterviewIcsBusy}
                    className="twin-link mt-2 text-xs font-medium"
                    onClick={() => {
                      void (async () => {
                        const token = getToken();
                        const ni = bundle.nextInterview;
                        if (!token || !ni) return;
                        setNextInterviewIcsBusy(true);
                        try {
                          const blob = await apiFetchBlob(
                            `/api/v1/calendar/interviews/${ni.id}/ics`,
                            {},
                            token,
                          );
                          saveBlobAsFile(blob, `twin-interview-${ni.id}.ics`);
                        } catch {
                          /* optional: surface via setError */
                        } finally {
                          setNextInterviewIcsBusy(false);
                        }
                      })();
                    }}
                  >
                    {nextInterviewIcsBusy ? "…" : t("dashboard.calendarInterviewDownloadIcs")}
                  </button>
                </>
              ) : (
                <p className="twin-muted mt-1.5 text-xs leading-relaxed">
                  {t("dashboard.calendarNextInterviewEmpty")}
                </p>
              )}
            </div>
          ) : null}
        </div>
        <div className="calendar-actions-block flex shrink-0 flex-col gap-2 self-start sm:min-w-[12rem]">
          <button
            type="button"
            className="twin-btn-solid twin-touch-target text-sm"
            disabled={webcalBusy}
            onClick={onWebcalOneClick}
          >
            {webcalBusy ? "…" : t("dashboard.calendarStripWebcalOneClick")}
          </button>
          {webcalUrl ? (
            <div className="flex flex-col gap-1">
              <input
                readOnly
                value={webcalToHttps(webcalUrl)}
                className="twin-input text-xs"
                aria-label="WebCal subscribe URL"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="twin-btn-secondary text-xs"
                  onClick={() => void navigator.clipboard.writeText(webcalToHttps(webcalUrl))}
                >
                  {t("dashboard.calendarStripWebcalCopy")}
                </button>
                <button
                  type="button"
                  className="twin-btn-secondary text-xs"
                  disabled={webcalBusy}
                  onClick={onWebcalRefresh}
                >
                  {webcalBusy ? "…" : t("dashboard.calendarStripWebcalRegenerate")}
                </button>
              </div>
            </div>
          ) : (
            <p className="twin-muted text-[11px] leading-snug">{t("dashboard.calendarStripWebcalHint")}</p>
          )}
          <Link
            href="/dashboard/calendar"
            className="twin-btn-secondary twin-touch-target text-center text-sm sm:text-left"
          >
            {t("dashboard.calendarStripCta")}
          </Link>
        </div>
      </div>
    </Card>
  );
}
