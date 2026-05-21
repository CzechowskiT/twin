"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch, apiFetchBlob, saveBlobAsFile } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import {
  mintAndOpenWebcalSubscribe,
  mintWebcalFeed,
  persistWebcalUrl,
  readStoredWebcalUrl,
  webcalToHttps,
} from "@/lib/webcal-subscribe";

type CalendarStatus = {
  connected: boolean;
  google_email: string | null;
  oauth_configured?: boolean;
  oauth_redirect_uri?: string | null;
};

function GoogleRedirectSetupHint({
  redirectUri,
  t,
}: {
  redirectUri: string;
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
      <p className="leading-relaxed">{t("dashboard.calendarGoogleRedirectSetup")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          readOnly
          value={redirectUri}
          className="twin-input min-w-0 flex-1 font-mono text-xs"
          aria-label="Google OAuth redirect URI"
        />
        <Button
          type="button"
          className="twin-btn-secondary twin-touch-target shrink-0"
          onClick={() => void navigator.clipboard.writeText(redirectUri)}
        >
          {t("dashboard.calendarGoogleRedirectCopy")}
        </Button>
      </div>
    </div>
  );
}

type MicrosoftCalendarStatus = {
  connected: boolean;
  microsoft_email: string | null;
  oauth_configured?: boolean;
};

type AuthorizePayload = { authorize_url: string };

type FreeBusyOut = { busy: { start: string; end: string }[] };

type EventOut = { id: string | null; html_link: string | null };

type NextSlotOut = { start_iso: string; end_iso: string };

type CalendarSlotsPayload = { slots: { start_iso: string; end_iso: string }[] };

type AuthMeOut = {
  email_product_updates: boolean;
  email_interview_reminders: boolean;
};

type ScheduledInterview = {
  id: number;
  company_name: string;
  job_title: string;
  interviewer_name: string | null;
  interviewer_email: string | null;
  interview_start: string;
  interview_end: string;
  timezone: string;
  meeting_link: string | null;
  meeting_location: string | null;
  interview_type: string;
  status: string;
  calendar_event_id: string | null;
};

function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatInterviewRange(isoStart: string, isoEnd: string, locale: string): string {
  const a = new Date(isoStart);
  const b = new Date(isoEnd);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${a.toLocaleString(locale, opts)} → ${b.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
}

async function downloadInterviewIcs(interviewId: number): Promise<Blob> {
  const token = getToken();
  if (!token) throw new Error("Not signed in");
  return apiFetchBlob(`/api/v1/calendar/interviews/${interviewId}/ics`, {}, token);
}

async function cancelInterviewRequest(interviewId: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not signed in");
  await apiFetch(`/api/v1/calendar/interviews/${interviewId}/cancel`, { method: "POST", body: "{}" }, token);
}

export default function DashboardCalendarPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [msStatus, setMsStatus] = useState<MicrosoftCalendarStatus | null>(null);
  const [webcalUrl, setWebcalUrl] = useState<string | null>(null);
  const [banner, setBanner] = useState<"connected" | "denied" | "error" | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  const [freeBusyResult, setFreeBusyResult] = useState<FreeBusyOut | null>(null);
  const [eventResult, setEventResult] = useState<EventOut | null>(null);
  const [interviews, setInterviews] = useState<ScheduledInterview[]>([]);
  const [scheduleNote, setScheduleNote] = useState<string | null>(null);
  const [suggestedSlots, setSuggestedSlots] = useState<{ start_iso: string; end_iso: string }[] | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [interviewerEmail, setInterviewerEmail] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [icsBusyId, setIcsBusyId] = useState<number | null>(null);
  const [cancelBusyId, setCancelBusyId] = useState<number | null>(null);
  const [showCancelledInterviews, setShowCancelledInterviews] = useState(false);
  const [emailProductUpdates, setEmailProductUpdates] = useState(false);
  const [emailInterviewReminders, setEmailInterviewReminders] = useState(false);
  const [notifPrefsLoadError, setNotifPrefsLoadError] = useState(false);
  const [notifPrefsSaveError, setNotifPrefsSaveError] = useState(false);
  const [notifPrefsSaving, setNotifPrefsSaving] = useState<null | keyof AuthMeOut>(null);
  const interviewRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInterviewRows = useCallback(
    async (token: string) => {
      const q = showCancelledInterviews ? "?include_cancelled=true" : "";
      const rows = await apiFetch<ScheduledInterview[]>(`/api/v1/calendar/google/interviews${q}`, {}, token);
      setInterviews(rows);
    },
    [showCancelledInterviews],
  );

  const scheduleDebouncedInterviewRefresh = useCallback(() => {
      const token = getToken();
      if (!token) return;
      if (interviewRefreshTimerRef.current) {
        clearTimeout(interviewRefreshTimerRef.current);
      }
      interviewRefreshTimerRef.current = setTimeout(() => {
        interviewRefreshTimerRef.current = null;
        void fetchInterviewRows(token).catch((e) => {
          console.warn("[calendar] debounced interview refresh failed", e);
        });
      }, 320);
    },
    [fetchInterviewRows],
  );

  useEffect(
    () => () => {
      if (interviewRefreshTimerRef.current) {
        clearTimeout(interviewRefreshTimerRef.current);
      }
    },
    [],
  );

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setActionError(false);
    setNotifPrefsLoadError(false);
    try {
      const [calRes, msRes, meRes] = await Promise.allSettled([
        apiFetch<CalendarStatus>("/api/v1/calendar/google/status", {}, token),
        apiFetch<MicrosoftCalendarStatus>("/api/v1/calendar/microsoft/status", {}, token),
        apiFetch<AuthMeOut>("/api/v1/auth/me", {}, token),
      ]);
      if (calRes.status === "rejected") {
        throw calRes.reason;
      }
      const s = calRes.value;
      setStatus(s);
      setMsStatus(
        msRes.status === "fulfilled"
          ? msRes.value
          : { connected: false, microsoft_email: null, oauth_configured: false },
      );
      if (meRes.status === "fulfilled") {
        setEmailProductUpdates(Boolean(meRes.value.email_product_updates));
        setEmailInterviewReminders(Boolean(meRes.value.email_interview_reminders));
      } else {
        setNotifPrefsLoadError(true);
      }
      await fetchInterviewRows(token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("401")) {
        clearToken();
        router.replace("/login");
        return;
      }
      setActionError(true);
      setStatus(null);
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  }, [router, fetchInterviewRows]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    queueMicrotask(() => {
      const c = searchParams.get("calendar_connected");
      const err = searchParams.get("calendar_error");
      if (c === "1" || c === "microsoft") setBanner("connected");
      else if (err === "google_denied" || err === "microsoft_denied") setBanner("denied");
      else if (err) setBanner("error");
    });
  }, [searchParams]);

  async function patchNotificationPreference<K extends keyof AuthMeOut>(key: K, value: boolean) {
    const token = getToken();
    if (!token) return;
    setNotifPrefsSaving(key);
    setNotifPrefsSaveError(false);
    try {
      const me = await apiFetch<AuthMeOut>(
        "/api/v1/auth/me/notification-preferences",
        { method: "PATCH", body: JSON.stringify({ [key]: value }) },
        token,
      );
      setEmailProductUpdates(Boolean(me.email_product_updates));
      setEmailInterviewReminders(Boolean(me.email_interview_reminders));
    } catch (e) {
      setNotifPrefsSaveError(true);
      console.warn("[calendar] notification preference patch failed", e);
    } finally {
      setNotifPrefsSaving(null);
    }
  }

  async function connect() {
    const token = getToken();
    if (!token) return;
    setActionBusy("connect");
    setActionError(false);
    try {
      const res = await apiFetch<AuthorizePayload>("/api/v1/calendar/google/authorize", {}, token);
      window.location.href = res.authorize_url;
    } catch (e) {
      setActionError(true);
      console.warn("[calendar] authorize failed", e);
    } finally {
      setActionBusy(null);
    }
  }

  async function connectMicrosoft() {
    const token = getToken();
    if (!token) return;
    setActionBusy("ms-connect");
    setActionError(false);
    try {
      const res = await apiFetch<AuthorizePayload>("/api/v1/calendar/microsoft/authorize", {}, token);
      window.location.href = res.authorize_url;
    } catch (e) {
      setActionError(true);
      console.warn("[calendar] microsoft authorize failed", e);
    } finally {
      setActionBusy(null);
    }
  }

  async function disconnectMicrosoft() {
    const token = getToken();
    if (!token) return;
    setActionBusy("ms-disconnect");
    setActionError(false);
    try {
      await apiFetch("/api/v1/calendar/microsoft", { method: "DELETE" }, token);
      setMsStatus({ connected: false, microsoft_email: null });
      await load();
    } catch (e) {
      setActionError(true);
      console.warn("[calendar] microsoft disconnect failed", e);
    } finally {
      setActionBusy(null);
    }
  }

  useEffect(() => {
    const stored = readStoredWebcalUrl();
    if (stored) setWebcalUrl(stored);
  }, []);

  async function subscribeWebcalOneClick() {
    const token = getToken();
    if (!token) return;
    setActionBusy("webcal");
    setActionError(false);
    try {
      const out = await mintAndOpenWebcalSubscribe(token);
      setWebcalUrl(out.webcal_url);
    } catch (e) {
      setActionError(true);
      console.warn("[calendar] webcal subscribe failed", e);
    } finally {
      setActionBusy(null);
    }
  }

  async function generateWebcalLink() {
    const token = getToken();
    if (!token) return;
    setActionBusy("webcal");
    setActionError(false);
    try {
      const out = await mintWebcalFeed(token);
      setWebcalUrl(out.webcal_url);
      persistWebcalUrl(out.webcal_url);
    } catch (e) {
      setActionError(true);
      console.warn("[calendar] webcal mint failed", e);
    } finally {
      setActionBusy(null);
    }
  }

  async function disconnect() {
    const token = getToken();
    if (!token) return;
    setActionBusy("disconnect");
    setActionError(false);
    try {
      await apiFetch("/api/v1/calendar/google", { method: "DELETE" }, token);
      setFreeBusyResult(null);
      setEventResult(null);
      setInterviews([]);
      setScheduleNote(null);
      setSuggestedSlots(null);
      setSuggestedSlots(null);
      await load();
    } catch (e) {
      setActionError(true);
      console.warn("[calendar] disconnect failed", e);
    } finally {
      setActionBusy(null);
    }
  }

  function activeCalendarProvider(): "google" | "microsoft" | null {
    if (status?.connected) return "google";
    if (msStatus?.connected) return "microsoft";
    return null;
  }

  async function runFreeBusy() {
    const token = getToken();
    const prov = activeCalendarProvider();
    if (!token || !prov) return;
    setActionBusy("freebusy");
    setActionError(false);
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    try {
      const out = await apiFetch<FreeBusyOut>(
        `/api/v1/calendar/${prov}/freebusy`,
        { method: "POST", body: JSON.stringify({ time_min: timeMin, time_max: timeMax }) },
        token,
      );
      setFreeBusyResult(out);
    } catch (e) {
      setActionError(true);
      console.warn("[calendar] freebusy failed", e);
    } finally {
      setActionBusy(null);
    }
  }

  async function createTestBlock() {
    const token = getToken();
    const prov = activeCalendarProvider();
    if (!token || prov !== "google") return;
    setActionBusy("event");
    setActionError(false);
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    start.setUTCMinutes(0, 0, 0);
    start.setUTCHours(14, 0, 0, 0);
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    try {
      const out = await apiFetch<EventOut>(
        "/api/v1/calendar/google/events",
        {
          method: "POST",
          body: JSON.stringify({
            summary: "TWIN: interview slot (test)",
            description: "Placed from TWIN dashboard to verify calendar write access.",
            start_iso: start.toISOString(),
            end_iso: end.toISOString(),
            time_zone: "UTC",
          }),
        },
        token,
      );
      setEventResult(out);
    } catch (e) {
      setActionError(true);
      console.warn("[calendar] create event failed", e);
    } finally {
      setActionBusy(null);
    }
  }

  async function suggestNextSlot() {
    const token = getToken();
    const prov = activeCalendarProvider();
    if (!token || !prov) return;
    setActionBusy("suggest");
    setScheduleNote(null);
    setSuggestedSlots(null);
    setActionError(false);
    try {
      const out = await apiFetch<NextSlotOut>(
        `/api/v1/calendar/${prov}/slots/next?duration_minutes=60&days_ahead=14`,
        {},
        token,
      );
      setStartLocal(isoToDatetimeLocalValue(out.start_iso));
      setEndLocal(isoToDatetimeLocalValue(out.end_iso));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("404")) setScheduleNote(t("dashboard.calendarScheduleNoSlot"));
      else {
        setActionError(true);
        console.warn("[calendar] suggest slot failed", e);
      }
    } finally {
      setActionBusy(null);
    }
  }

  async function loadSlotOptions() {
    const token = getToken();
    const prov = activeCalendarProvider();
    if (!token || !prov) return;
    setActionBusy("slots");
    setScheduleNote(null);
    setSuggestedSlots(null);
    setActionError(false);
    try {
      const out = await apiFetch<CalendarSlotsPayload>(
        `/api/v1/calendar/${prov}/slots?duration_minutes=60&days_ahead=14&limit=8`,
        {},
        token,
      );
      setSuggestedSlots(out.slots);
      if (!out.slots.length) setScheduleNote(t("dashboard.calendarSlotsEmpty"));
    } catch (e) {
      setActionError(true);
      console.warn("[calendar] load slots failed", e);
    } finally {
      setActionBusy(null);
    }
  }

  async function saveInterview() {
    const token = getToken();
    const prov = activeCalendarProvider();
    if (!token || !prov) return;
    const startIso = datetimeLocalToIso(startLocal);
    const endIso = datetimeLocalToIso(endLocal);
    if (!companyName.trim() || !jobTitle.trim() || !startIso || !endIso) {
      setScheduleNote(null);
      return;
    }
    setActionBusy("schedule");
    setScheduleNote(null);
    setActionError(false);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    try {
      await apiFetch<ScheduledInterview>(
        `/api/v1/calendar/${prov}/interviews`,
        {
          method: "POST",
          body: JSON.stringify({
            application_id: null,
            company_name: companyName.trim(),
            job_title: jobTitle.trim(),
            interviewer_email: interviewerEmail.trim() || null,
            start_iso: startIso,
            end_iso: endIso,
            time_zone: tz,
            interview_type: "video",
          }),
        },
        token,
      );
      setScheduleNote(t("dashboard.calendarScheduleSaved"));
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("not available") || msg.includes("409")) {
        setScheduleNote(t("dashboard.calendarScheduleConflict"));
      } else {
        setActionError(true);
        console.warn("[calendar] schedule interview failed", e);
      }
    } finally {
      setActionBusy(null);
    }
  }

  const loc = locale === "pl" ? "pl-PL" : "en-US";

  return (
    <Shell wide rail>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">{t("dashboard.calendarPageTitle")}</h1>
          <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("dashboard.calendarPageLead")}</p>
        </div>
        <Link href="/dashboard" className="twin-link twin-touch-target text-sm">
          {t("dashboard.calendarBackDashboard")}
        </Link>
      </div>

      <Card className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
          {t("dashboard.calendarProvidersEyebrow")}
        </p>
        <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
          <li className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.calendarProviderGoogleTitle")}</span>
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                {t("dashboard.calendarStatusLive")}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">{t("dashboard.calendarProviderGoogleBody")}</p>
          </li>
          <li className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.calendarProviderMicrosoftTitle")}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  msStatus?.connected
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                }`}
              >
                {msStatus?.connected ? t("dashboard.calendarStatusLive") : t("dashboard.calendarStatusPlanned")}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">{t("dashboard.calendarProviderMicrosoftBody")}</p>
          </li>
          <li className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.calendarProviderAppleTitle")}</span>
              <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                {t("dashboard.calendarStatusPlanned")}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">{t("dashboard.calendarProviderAppleBody")}</p>
          </li>
          <li className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.calendarProviderOtherTitle")}</span>
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                {t("dashboard.calendarStatusLive")}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">{t("dashboard.calendarProviderOtherBody")}</p>
          </li>
        </ul>
        <p className="twin-muted mt-4 text-xs leading-relaxed">{t("dashboard.calendarProvidersFoot")}</p>
      </Card>

      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">{t("dashboard.calendarNotifSectionTitle")}</h2>
        <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("dashboard.calendarNotifSectionLead")}</p>
        {notifPrefsLoadError ? (
          <p className="mt-3 text-sm text-[var(--twin-muted-strong)]" role="alert">
            {t("dashboard.calendarNotifPrefsLoadError")}
          </p>
        ) : null}
        {notifPrefsSaveError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {t("dashboard.calendarNotifPrefsSaveError")}
          </p>
        ) : null}
        <ul className="mt-4 list-none space-y-4 p-0">
          <li>
            <label className="flex cursor-pointer flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <span>
                <span className="block text-sm font-medium text-[var(--foreground)]">{t("dashboard.calendarNotifProductLabel")}</span>
                <span className="twin-muted mt-0.5 block text-xs leading-relaxed">{t("dashboard.calendarNotifProductHint")}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 sm:pt-0.5">
                {notifPrefsSaving === "email_product_updates" ? (
                  <span className="text-xs text-[var(--twin-muted-strong)]">{t("dashboard.calendarNotifSaving")}</span>
                ) : null}
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-[var(--twin-border)] accent-[var(--foreground)]"
                  checked={emailProductUpdates}
                  disabled={Boolean(notifPrefsSaving) || notifPrefsLoadError}
                  onChange={(e) => void patchNotificationPreference("email_product_updates", e.target.checked)}
                />
              </span>
            </label>
          </li>
          <li>
            <label className="flex cursor-pointer flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <span>
                <span className="block text-sm font-medium text-[var(--foreground)]">{t("dashboard.calendarNotifInterviewLabel")}</span>
                <span className="twin-muted mt-0.5 block text-xs leading-relaxed">{t("dashboard.calendarNotifInterviewHint")}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 sm:pt-0.5">
                {notifPrefsSaving === "email_interview_reminders" ? (
                  <span className="text-xs text-[var(--twin-muted-strong)]">{t("dashboard.calendarNotifSaving")}</span>
                ) : null}
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-[var(--twin-border)] accent-[var(--foreground)]"
                  checked={emailInterviewReminders}
                  disabled={Boolean(notifPrefsSaving) || notifPrefsLoadError}
                  onChange={(e) => void patchNotificationPreference("email_interview_reminders", e.target.checked)}
                />
              </span>
            </label>
          </li>
        </ul>
      </Card>

      {banner === "connected" ? (
        <Card variant="soft" className="mb-4 border-emerald-200/80 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-50">
          <p className="text-sm font-medium">{t("dashboard.calendarConnected")}</p>
        </Card>
      ) : null}
      {banner === "denied" ? (
        <Card variant="soft" className="mb-4">
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.calendarOAuthDenied")}</p>
        </Card>
      ) : null}
      {banner === "error" ? (
        <Card variant="soft" className="mb-4">
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.calendarErrorGeneric")}</p>
        </Card>
      ) : null}
      {actionError ? (
        <Card variant="soft" className="mb-4">
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.calendarErrorGeneric")}</p>
        </Card>
      ) : null}

      <Card variant="accent" className="mb-6">
        <p className="twin-muted text-xs leading-relaxed">{t("dashboard.calendarConfiguredHint")}</p>
      </Card>

      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">{t("dashboard.calendarWebcalTitle")}</h2>
        <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("dashboard.calendarWebcalHint")}</p>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="twin-touch-target"
              disabled={Boolean(actionBusy)}
              onClick={() => void subscribeWebcalOneClick()}
            >
              {actionBusy === "webcal" ? "…" : t("dashboard.calendarWebcalOneClick")}
            </Button>
            <Button
              type="button"
              className="twin-btn-secondary twin-touch-target"
              disabled={Boolean(actionBusy)}
              onClick={() => void generateWebcalLink()}
            >
              {actionBusy === "webcal" ? "…" : t("dashboard.calendarWebcalGenerate")}
            </Button>
          </div>
          {webcalUrl ? (
            <div className="flex flex-wrap gap-2">
              <input
                readOnly
                value={webcalToHttps(webcalUrl)}
                className="twin-input min-w-0 flex-1 text-sm"
                aria-label="WebCal URL"
              />
              <Button
                type="button"
                className="twin-btn-secondary twin-touch-target shrink-0"
                onClick={() => void navigator.clipboard.writeText(webcalToHttps(webcalUrl))}
              >
                {t("dashboard.calendarWebcalCopy")}
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.identityLoading")}</p>
      ) : status?.connected || msStatus?.connected ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--twin-border)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.calendarProviderGoogleTitle")}</p>
              {status?.connected ? (
                <>
                  {status.google_email ? (
                    <p className="twin-muted mt-1 text-sm">
                      {t("dashboard.calendarConnectedAs")}: {status.google_email}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    className="twin-btn-secondary twin-touch-target mt-3"
                    disabled={Boolean(actionBusy)}
                    onClick={() => void disconnect()}
                  >
                    {actionBusy === "disconnect" ? "…" : t("dashboard.calendarDisconnect")}
                  </Button>
                </>
              ) : status?.oauth_configured === false ? (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                  {t("dashboard.calendarGoogleOAuthNotConfigured")}
                </p>
              ) : (
                <>
                  <Button
                    type="button"
                    className="twin-touch-target mt-3"
                    disabled={Boolean(actionBusy)}
                    onClick={() => void connect()}
                  >
                    {actionBusy === "connect" ? "…" : t("dashboard.calendarConnect")}
                  </Button>
                  {status?.oauth_redirect_uri ? (
                    <GoogleRedirectSetupHint redirectUri={status.oauth_redirect_uri} t={t} />
                  ) : null}
                </>
              )}
            </div>
            <div className="rounded-xl border border-[var(--twin-border)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.calendarProviderMicrosoftTitle")}</p>
              {msStatus?.connected ? (
                <>
                  {msStatus.microsoft_email ? (
                    <p className="twin-muted mt-1 text-sm">
                      {t("dashboard.calendarMicrosoftConnectedAs")}: {msStatus.microsoft_email}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    className="twin-btn-secondary twin-touch-target mt-3"
                    disabled={Boolean(actionBusy)}
                    onClick={() => void disconnectMicrosoft()}
                  >
                    {actionBusy === "ms-disconnect" ? "…" : t("dashboard.calendarDisconnectMicrosoft")}
                  </Button>
                </>
              ) : msStatus?.oauth_configured === false ? (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                  {t("dashboard.calendarMicrosoftOAuthNotConfigured")}
                </p>
              ) : (
                <Button
                  type="button"
                  className="twin-touch-target mt-3"
                  disabled={Boolean(actionBusy)}
                  onClick={() => void connectMicrosoft()}
                >
                  {actionBusy === "ms-connect" ? "…" : t("dashboard.calendarConnectMicrosoft")}
                </Button>
              )}
            </div>
          </div>

          <div className="border-t border-[var(--twin-border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t("dashboard.calendarInterviewsTitle")}</h2>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-[var(--twin-muted-strong)]">
              <input
                type="checkbox"
                checked={showCancelledInterviews}
                onChange={(e) => setShowCancelledInterviews(e.target.checked)}
                className="h-4 w-4 rounded border border-[var(--twin-border)] accent-[var(--foreground)]"
              />
              <span>{t("dashboard.calendarShowCancelledInterviews")}</span>
            </label>
            {interviews.length === 0 ? (
              <p className="twin-muted mt-2 text-sm leading-relaxed">{t("dashboard.calendarInterviewsEmpty")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {interviews.map((row) => (
                  <li
                    key={row.id}
                    className={`flex flex-col gap-2 rounded-lg border border-[var(--twin-border)] px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between ${
                      row.status === "cancelled"
                        ? "bg-[var(--twin-surface-2)]/50 opacity-75"
                        : "bg-[var(--twin-surface-2)] text-[var(--foreground)]"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-medium">
                        {row.company_name} — {row.job_title}
                        {row.status === "cancelled" ? (
                          <span className="ml-2 text-xs font-normal uppercase text-[var(--twin-muted)]">
                            {t("dashboard.calendarInterviewCancelledBadge")}
                          </span>
                        ) : null}
                      </span>
                      <span className="twin-muted mt-1 block text-xs">
                        {formatInterviewRange(row.interview_start, row.interview_end, loc)}
                      </span>
                      {row.meeting_link?.trim() ? (
                        <a
                          href={row.meeting_link.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="twin-link mt-1 inline-block text-xs font-medium"
                        >
                          {t("dashboard.calendarNextInterviewJoinLink")}
                        </a>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        className="twin-link text-xs font-medium"
                        disabled={icsBusyId === row.id || row.status === "cancelled"}
                        onClick={() => {
                          void (async () => {
                            setIcsBusyId(row.id);
                            try {
                              const blob = await downloadInterviewIcs(row.id);
                              saveBlobAsFile(blob, `twin-interview-${row.id}.ics`);
                            } catch (e) {
                              console.warn("[calendar] ics download failed", e);
                            } finally {
                              setIcsBusyId(null);
                            }
                          })();
                        }}
                      >
                        {icsBusyId === row.id ? "…" : t("dashboard.calendarInterviewDownloadIcs")}
                      </button>
                      {row.status !== "cancelled" ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                          disabled={cancelBusyId === row.id}
                          onClick={() => {
                            void (async () => {
                              setCancelBusyId(row.id);
                              try {
                                await cancelInterviewRequest(row.id);
                                setInterviews((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id ? { ...r, status: "cancelled" } : r,
                                  ),
                                );
                                scheduleDebouncedInterviewRefresh();
                              } catch (e) {
                                console.warn("[calendar] cancel failed", e);
                              } finally {
                                setCancelBusyId(null);
                              }
                            })();
                          }}
                        >
                          {cancelBusyId === row.id ? "…" : t("dashboard.calendarInterviewCancel")}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-[var(--twin-border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t("dashboard.calendarScheduleTitle")}</h2>
            <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("dashboard.calendarScheduleHint")}</p>
            <div className="mt-4 flex flex-col gap-3 sm:max-w-xl">
              <label className="block text-sm">
                <span className="twin-muted block text-xs">{t("dashboard.calendarScheduleCompany")}</span>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--twin-border)] bg-[var(--background)] px-3 py-2 text-sm"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  autoComplete="organization"
                />
              </label>
              <label className="block text-sm">
                <span className="twin-muted block text-xs">{t("dashboard.calendarScheduleJob")}</span>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--twin-border)] bg-[var(--background)] px-3 py-2 text-sm"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="twin-muted block text-xs">{t("dashboard.calendarScheduleInterviewerEmail")}</span>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--twin-border)] bg-[var(--background)] px-3 py-2 text-sm"
                  type="email"
                  value={interviewerEmail}
                  onChange={(e) => setInterviewerEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <label className="block text-sm">
                <span className="twin-muted block text-xs">{t("dashboard.calendarScheduleStart")}</span>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--twin-border)] bg-[var(--background)] px-3 py-2 text-sm"
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="twin-muted block text-xs">{t("dashboard.calendarScheduleEnd")}</span>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--twin-border)] bg-[var(--background)] px-3 py-2 text-sm"
                  type="datetime-local"
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="twin-touch-target twin-btn-secondary"
                  disabled={Boolean(actionBusy)}
                  onClick={() => void suggestNextSlot()}
                >
                  {actionBusy === "suggest" ? "…" : t("dashboard.calendarScheduleSuggest")}
                </Button>
                <Button
                  type="button"
                  className="twin-touch-target twin-btn-secondary"
                  disabled={Boolean(actionBusy)}
                  onClick={() => void loadSlotOptions()}
                >
                  {actionBusy === "slots" ? "…" : t("dashboard.calendarSlotsGo")}
                </Button>
                <Button type="button" className="twin-touch-target" disabled={Boolean(actionBusy)} onClick={() => void saveInterview()}>
                  {actionBusy === "schedule" ? "…" : t("dashboard.calendarScheduleSubmit")}
                </Button>
              </div>
              {suggestedSlots && suggestedSlots.length > 0 ? (
                <div className="mt-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                    {t("dashboard.calendarSlotsTitle")}
                  </p>
                  <p className="twin-muted mt-1 text-xs leading-relaxed">{t("dashboard.calendarSlotsHint")}</p>
                  <ul className="mt-2 space-y-1">
                    {suggestedSlots.map((s) => (
                      <li key={`${s.start_iso}-${s.end_iso}`}>
                        <button
                          type="button"
                          className="w-full rounded-md border border-transparent px-2 py-1.5 text-left text-sm text-[var(--foreground)] hover:border-[var(--twin-border)] hover:bg-[var(--twin-surface-raised)]"
                          onClick={() => {
                            setStartLocal(isoToDatetimeLocalValue(s.start_iso));
                            setEndLocal(isoToDatetimeLocalValue(s.end_iso));
                          }}
                        >
                          {formatInterviewRange(s.start_iso, s.end_iso, loc)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {scheduleNote ? (
                <p className="text-sm text-[var(--twin-muted-strong)]" role="status">
                  {scheduleNote}
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[var(--twin-border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t("dashboard.calendarFreebusyTitle")}</h2>
            <Button
              type="button"
              className="twin-touch-target mt-3"
              disabled={Boolean(actionBusy)}
              onClick={() => void runFreeBusy()}
            >
              {actionBusy === "freebusy" ? "…" : t("dashboard.calendarFreebusyGo")}
            </Button>
            {freeBusyResult ? (
              <ul className="mt-3 list-inside list-disc text-sm text-[var(--twin-muted-strong)]">
                {freeBusyResult.busy.length === 0 ? (
                  <li>{t("dashboard.calendarFreebusyEmpty")}</li>
                ) : (
                  freeBusyResult.busy.map((b) => (
                    <li key={`${b.start}-${b.end}`}>
                      {b.start} → {b.end}
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>

          <div className="border-t border-[var(--twin-border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{t("dashboard.calendarBlockTitle")}</h2>
            <Button
              type="button"
              className="twin-touch-target mt-3"
              disabled={Boolean(actionBusy)}
              onClick={() => void createTestBlock()}
            >
              {actionBusy === "event" ? "…" : t("dashboard.calendarBlockGo")}
            </Button>
            {eventResult?.html_link ? (
              <p className="mt-3 text-sm">
                <a href={eventResult.html_link} className="twin-link font-medium" target="_blank" rel="noreferrer">
                  {t("dashboard.calendarOpenGoogle")}
                </a>
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--twin-border)] p-4">
            <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.calendarNotConnected")}</p>
            {status?.oauth_configured === false ? (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                {t("dashboard.calendarGoogleOAuthNotConfigured")}
              </p>
            ) : (
              <>
                <Button type="button" className="twin-touch-target mt-3" disabled={Boolean(actionBusy)} onClick={() => void connect()}>
                  {actionBusy === "connect" ? "…" : t("dashboard.calendarConnect")}
                </Button>
                {status?.oauth_redirect_uri ? (
                  <GoogleRedirectSetupHint redirectUri={status.oauth_redirect_uri} t={t} />
                ) : null}
              </>
            )}
          </div>
          <div className="rounded-xl border border-[var(--twin-border)] p-4">
            <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.calendarProviderMicrosoftBody")}</p>
            {msStatus?.oauth_configured === false ? (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                {t("dashboard.calendarMicrosoftOAuthNotConfigured")}
              </p>
            ) : (
              <Button
                type="button"
                className="twin-touch-target mt-3"
                disabled={Boolean(actionBusy)}
                onClick={() => void connectMicrosoft()}
              >
                {actionBusy === "ms-connect" ? "…" : t("dashboard.calendarConnectMicrosoft")}
              </Button>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
