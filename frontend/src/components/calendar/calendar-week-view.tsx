"use client";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { addDays, eventsByDay, formatEventTimeRange, type DisplayCalendarEvent } from "@/lib/calendar-week";

type CalendarWeekViewProps = {
  weekStart: Date;
  events: DisplayCalendarEvent[];
  loading: boolean;
  loadError: boolean;
  accountEmail: string | null;
  providerLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
};

export function CalendarWeekView({
  weekStart,
  events,
  loading,
  loadError,
  accountEmail,
  providerLabel,
  onPrevWeek,
  onNextWeek,
  onToday,
}: CalendarWeekViewProps) {
  const { t, locale } = useTranslation();
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const weekEnd = addDays(weekStart, 6);
  const rangeLabel = `${weekStart.toLocaleDateString(loc, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })}`;
  const byDay = eventsByDay(events, weekStart, loc);
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
      ) : loadError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {t("dashboard.calendarErrorGeneric")}
        </p>
      ) : !hasAny ? (
        <p className="twin-muted mt-4 text-sm leading-relaxed">{t("dashboard.calendarViewEmpty")}</p>
      ) : (
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
      )}
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
