"use client";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { Button } from "@/components/ui";
import type { CalendarProvider } from "@/lib/calendar-week";
import { addDays, eventsByDay, formatEventTimeRange, type DisplayCalendarEvent } from "@/lib/calendar-week";
import type { EventsPhase } from "@/lib/calendar-provider-health";

type CalendarWeekViewProps = {
  weekStart: Date;
  events: DisplayCalendarEvent[];
  loading: boolean;
  loadError: boolean;
  eventsPhase?: EventsPhase;
  showEmptyWeek: boolean;
  showReconnectPanel: boolean;
  showPartialWarning: boolean;
  failedProviders: CalendarProvider[];
  accountEmail: string | null;
  providerLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onRetryEvents?: () => void;
};

export function CalendarWeekView({
  weekStart,
  events,
  loading,
  loadError,
  eventsPhase,
  showEmptyWeek,
  showReconnectPanel,
  showPartialWarning,
  failedProviders,
  accountEmail,
  providerLabel,
  onPrevWeek,
  onNextWeek,
  onToday,
  onRetryEvents,
}: CalendarWeekViewProps) {
  const { t, locale } = useTranslation();
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const weekEnd = addDays(weekStart, 6);
  const rangeLabel = `${weekStart.toLocaleDateString(loc, { month: "short", day: "numeric", timeZone })} – ${weekEnd.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric", timeZone })}`;
  const byDay = eventsByDay(events, weekStart, loc, timeZone);
  const hasAny = events.length > 0;

  return (
    <Card className="mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--foreground)]">{t("dashboard.calendarViewTitle")}</h2>
          {accountEmail ? (
            <p className="twin-muted mt-1 text-sm">
              {providerLabel} · {accountEmail}
            </p>
          ) : (
            <p className="twin-muted mt-1 text-sm">{providerLabel}</p>
          )}
          <p className="twin-muted mt-1 text-xs leading-relaxed">{t("dashboard.calendarViewDataHint")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="twin-btn-secondary twin-touch-target text-sm" onClick={onPrevWeek}>
            {t("dashboard.calendarViewPrevWeek")}
          </button>
          <button type="button" className="twin-btn-secondary twin-touch-target text-sm" onClick={onToday}>
            {t("dashboard.calendarViewToday")}
          </button>
          <button type="button" className="twin-btn-secondary twin-touch-target text-sm" onClick={onNextWeek}>
            {t("dashboard.calendarViewNextWeek")}
          </button>
        </div>
      </div>
      <p className="twin-muted mt-2 text-xs font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
        {rangeLabel}
      </p>

      {loading ? (
        <p className="twin-muted mt-4 text-sm">{t("dashboard.calendarViewLoading")}</p>
      ) : showReconnectPanel ? (
        <div className="mt-4 rounded-lg border border-amber-300/80 bg-amber-50/90 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            {t("dashboard.calendarAllProvidersReconnectTitle")}
          </p>
          <p className="mt-1 text-sm text-amber-900 dark:text-amber-100/90">{t("dashboard.calendarAllProvidersReconnectBody")}</p>
        </div>
      ) : loadError || eventsPhase === "temporary_error" || eventsPhase === "timeout" ? (
        <div className="mt-4 rounded-lg border border-sky-300/80 bg-sky-50/90 px-4 py-3 dark:border-sky-900/50 dark:bg-sky-950/30">
          <p className="text-sm font-medium text-sky-950 dark:text-sky-100" role="alert">
            {t("dashboard.calendarEventsReadError")}
          </p>
          <p className="mt-1 text-sm text-sky-900 dark:text-sky-100/90">{t("dashboard.calendarEventsReadRetryHint")}</p>
          {onRetryEvents ? (
            <Button type="button" className="twin-touch-target mt-3 !w-auto self-start" onClick={onRetryEvents}>
              {t("dashboard.calendarRetryEvents")}
            </Button>
          ) : null}
        </div>
      ) : showPartialWarning ? (
        <p className="mt-4 text-sm text-amber-800 dark:text-amber-200" role="status">
          {t("dashboard.calendarPartialFailure")}
          {failedProviders.length > 0 ? ` (${failedProviders.join(", ")})` : null}
        </p>
      ) : null}

      {!loading && !showReconnectPanel && !loadError && showEmptyWeek && !hasAny ? (
        <p className="twin-muted mt-4 text-sm leading-relaxed">{t("dashboard.calendarViewEmpty")}</p>
      ) : null}

      {!loading && !showReconnectPanel && !loadError && hasAny ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {byDay.map((day) => (
            <div
              key={day.dayKey}
              className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/60 p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                {day.label}
              </p>
              {day.items.length === 0 ? (
                <p className="twin-muted mt-2 text-xs">—</p>
              ) : (
                <ul className="mt-2 list-none space-y-2 p-0">
                  {day.items.map((ev) => (
                    <li key={ev.id} className="text-sm">
                      <EventRow ev={ev} locale={loc} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function EventRow({ ev, locale }: { ev: DisplayCalendarEvent; locale: string }) {
  const { t } = useTranslation();
  const timeLabel = ev.all_day
    ? t("dashboard.calendarViewAllDay")
    : formatEventTimeRange(ev.start_iso, ev.end_iso, ev.all_day, locale);

  return (
    <div className="rounded-md border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-2 py-1.5">
      <p className="font-medium text-[var(--foreground)] leading-snug">{ev.title}</p>
      <p className="twin-muted mt-0.5 text-xs">{timeLabel}</p>
      {ev.source === "twin" ? (
        <span className="mt-1 inline-block rounded bg-[var(--twin-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground)]">
          {t("dashboard.calendarViewTwinBadge")}
        </span>
      ) : null}
      {ev.meeting_link?.trim() ? (
        <a
          href={ev.meeting_link.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="twin-link mt-1 block text-xs font-medium"
        >
          {t("dashboard.calendarNextInterviewJoinLink")}
        </a>
      ) : null}
      {ev.html_link ? (
        <a
          href={ev.html_link}
          target="_blank"
          rel="noopener noreferrer"
          className="twin-link mt-1 block text-xs"
        >
          {t("dashboard.calendarViewOpenExternal")}
        </a>
      ) : null}
    </div>
  );
}
