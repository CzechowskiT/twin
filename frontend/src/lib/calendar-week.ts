/** Week boundaries and display helpers for the dashboard calendar view. */

export type CalendarProvider = "google" | "microsoft";

export type ProviderCalendarEvent = {
  id: string;
  title: string;
  start_iso: string;
  end_iso: string;
  all_day: boolean;
  html_link: string | null;
  source: "provider" | "twin";
};

export type TwinInterviewRow = {
  id: number;
  company_name: string;
  job_title: string;
  interview_start: string;
  interview_end: string;
  meeting_link: string | null;
  status: string;
  calendar_event_id: string | null;
};

export type DisplayCalendarEvent = ProviderCalendarEvent & {
  twinInterviewId?: number;
  meeting_link?: string | null;
};

export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar date YYYY-MM-DD in an IANA zone (host local when `timeZone` omitted). */
export function toLocalCalendarDateKey(d: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (y && m && day) return `${y}-${m}-${day}`;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Day bucket for grouping; date-only all-day uses `start_iso` without UTC midnight parsing. */
export function eventLocalCalendarDateKey(
  startIso: string,
  allDay: boolean,
  timeZone?: string,
): string | null {
  if (allDay && DATE_ONLY_RE.test(startIso)) return startIso;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;
  return toLocalCalendarDateKey(start, timeZone);
}

export function weekRangeIso(weekStart: Date): { timeMin: string; timeMax: string } {
  const end = addDays(weekStart, 7);
  end.setHours(23, 59, 59, 999);
  return { timeMin: weekStart.toISOString(), timeMax: end.toISOString() };
}

export function mergeProviderAndTwinEvents(
  providerEvents: ProviderCalendarEvent[],
  interviews: TwinInterviewRow[],
  weekStart: Date,
): DisplayCalendarEvent[] {
  const weekEnd = addDays(weekStart, 7);
  const twinByEventId = new Map<string, TwinInterviewRow>();
  for (const row of interviews) {
    if (row.status === "cancelled") continue;
    if (row.calendar_event_id) twinByEventId.set(row.calendar_event_id, row);
  }

  const usedTwinIds = new Set<number>();
  const merged: DisplayCalendarEvent[] = [];

  for (const ev of providerEvents) {
    const twin = twinByEventId.get(ev.id);
    if (twin) {
      usedTwinIds.add(twin.id);
      merged.push({
        ...ev,
        title: `${twin.company_name} — ${twin.job_title}`,
        source: "twin",
        twinInterviewId: twin.id,
        meeting_link: twin.meeting_link,
      });
    } else {
      merged.push(ev);
    }
  }

  for (const row of interviews) {
    if (row.status === "cancelled" || usedTwinIds.has(row.id)) continue;
    const start = new Date(row.interview_start);
    if (Number.isNaN(start.getTime()) || start < weekStart || start >= weekEnd) continue;
    merged.push({
      id: `twin-${row.id}`,
      title: `${row.company_name} — ${row.job_title}`,
      start_iso: row.interview_start,
      end_iso: row.interview_end,
      all_day: false,
      html_link: null,
      source: "twin",
      twinInterviewId: row.id,
      meeting_link: row.meeting_link,
    });
  }

  merged.sort((a, b) => new Date(a.start_iso).getTime() - new Date(b.start_iso).getTime());
  return merged;
}

export function eventsByDay(
  events: DisplayCalendarEvent[],
  weekStart: Date,
  locale: string,
  timeZone?: string,
): { dayKey: string; label: string; items: DisplayCalendarEvent[] }[] {
  const days: { dayKey: string; label: string; items: DisplayCalendarEvent[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dayKey = toLocalCalendarDateKey(day, timeZone);
    const label = day.toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone,
    });
    const items = events.filter((ev) => {
      const eventKey = eventLocalCalendarDateKey(ev.start_iso, ev.all_day, timeZone);
      return eventKey === dayKey;
    });
    days.push({ dayKey, label, items });
  }
  return days;
}

export function formatEventTimeRange(
  startIso: string,
  endIso: string,
  allDay: boolean,
  locale: string,
): string {
  if (allDay) return "—";
  const a = new Date(startIso);
  const b = new Date(endIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${a.toLocaleTimeString(locale, timeOpts)} – ${b.toLocaleTimeString(locale, timeOpts)}`;
}
