"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FollowUpModal,
  InterviewPrepModal,
} from "@/components/career-assistant/career-assistant-modals";
import { CalendarConnectedSuccessAlert } from "@/components/calendar/calendar-connected-success-alert";
import { CalendarConnectionsPanel } from "@/components/calendar/calendar-connections-panel";
import { CalendarOperatingEvidenceSection } from "@/components/calendar/calendar-operating-evidence-section";
import { CalendarWeekView } from "@/components/calendar/calendar-week-view";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { WorkspaceFlowSteps } from "@/components/ux/workspace-flow-steps";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch, apiFetchBlob, isFetchTimeoutError, saveBlobAsFile } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { candidateCalendarHref } from "@/lib/persona-access";
import { LOGIN_PATH } from "@/lib/persona-auth";
import { calendarProviderLabel } from "@/lib/calendar-provider";
import {
  aggregateWeekEventOutcomes,
  CALENDAR_FETCH_TIMEOUT_MS,
  connectionHealthForProvider,
  debugCalendarLog,
  diagnosticFromErrorMessage,
  eventsPhaseFromFlags,
  logCalendarOperationDiagnostic,
  hasAnyConnectedProvider,
  hasAnyHealthyProvider,
  healthyProvidersToFetch,
  parseProviderIntegrationError,
  preferredActiveProvider,
  providerNeedsAttention,
  providerNeedsReconnect,
  providerStatusBootstrapComplete,
  statusSnapshotFromApi,
  type CalendarProviderStatusSnapshot,
  type ProviderStatusPhase,
  type ProviderWeekFetchOutcome,
  type WeekEventsPhase,
} from "@/lib/calendar-provider-health";
import { fetchOpsHealth, type OpsHealth } from "@/lib/ops-health";
import {
  mergeProviderAndTwinEvents,
  startOfWeekMonday,
  weekRangeIso,
  type DisplayCalendarEvent,
  type ProviderCalendarEvent,
} from "@/lib/calendar-week";
import type { TranslationKey } from "@/lib/i18n";
import { detectMeetingProvider, meetingProviderLabelKey } from "@/lib/meeting-link";
import {
  mintAndOpenWebcalSubscribe,
  mintWebcalFeed,
  persistWebcalUrl,
  readStoredWebcalUrl,
  webcalToHttps,
} from "@/lib/webcal-subscribe";

type CalendarOAuthConfig = {
  google: { redirect_uri: string; oauth_configured: boolean };
  microsoft: { redirect_uri: string; oauth_configured: boolean };
  dev_redirect_uris?: { google: string[]; microsoft: string[] };
};

type CalendarStatus = {
  connected: boolean;
  health?: string;
  message?: string | null;
  provider?: string;
  google_email: string | null;
  oauth_configured?: boolean;
  oauth_redirect_uri?: string | null;
};

type MicrosoftCalendarStatus = {
  connected: boolean;
  health?: string;
  message?: string | null;
  provider?: string;
  microsoft_email: string | null;
  oauth_configured?: boolean;
  oauth_redirect_uri?: string | null;
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

type CalendarEventsPayload = { events: ProviderCalendarEvent[] };

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
  const { hidden: pageHidden } = usePageVisibility();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [googleStatusPhase, setGoogleStatusPhase] = useState<ProviderStatusPhase>("loading");
  const [microsoftStatusPhase, setMicrosoftStatusPhase] = useState<ProviderStatusPhase>("loading");
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [msStatus, setMsStatus] = useState<MicrosoftCalendarStatus | null>(null);
  const [oauthCfg, setOauthCfg] = useState<CalendarOAuthConfig | null>(null);
  const [opsHealth, setOpsHealth] = useState<OpsHealth | null>(null);
  const [webcalUrl, setWebcalUrl] = useState<string | null>(null);
  const [webcalExpiresAt, setWebcalExpiresAt] = useState<string | null>(null);
  const [googleStatusError, setGoogleStatusError] = useState(false);
  const [microsoftStatusError, setMicrosoftStatusError] = useState(false);
  const [banner, setBanner] = useState<"connected" | "denied" | "error" | null>(null);
  const [calendarErrorCode, setCalendarErrorCode] = useState<string | null>(null);
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
  const [prepInterview, setPrepInterview] = useState<{ id: number; title: string } | null>(null);
  const [followUpInterview, setFollowUpInterview] = useState<{ id: number; title: string } | null>(null);
  const [emailProductUpdates, setEmailProductUpdates] = useState(false);
  const [emailInterviewReminders, setEmailInterviewReminders] = useState(false);
  const [notifPrefsLoadError, setNotifPrefsLoadError] = useState(false);
  const [notifPrefsSaveError, setNotifPrefsSaveError] = useState(false);
  const [notifPrefsSaving, setNotifPrefsSaving] = useState<null | keyof AuthMeOut>(null);
  const [webcalLinkCopied, setWebcalLinkCopied] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [displayEvents, setDisplayEvents] = useState<DisplayCalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsLoadError, setEventsLoadError] = useState(false);
  const [weekShowEmpty, setWeekShowEmpty] = useState(false);
  const [weekShowReconnectPanel, setWeekShowReconnectPanel] = useState(false);
  const [weekShowPartialWarning, setWeekShowPartialWarning] = useState(false);
  const [weekFailedProviders, setWeekFailedProviders] = useState<Array<"google" | "microsoft">>([]);
  const [weekFetchOutcomes, setWeekFetchOutcomes] = useState<ProviderWeekFetchOutcome[]>([]);
  const interviewRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calendarConnectedQueryRef = useRef<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const eventsRequestIdRef = useRef(0);
  const [eventsPhase, setEventsPhase] = useState<WeekEventsPhase>("idle");

  const statusBootstrapComplete = providerStatusBootstrapComplete(googleStatusPhase, microsoftStatusPhase);

  const googleSnapshot: CalendarProviderStatusSnapshot | null = useMemo(
    () => (status ? statusSnapshotFromApi("google", status) : null),
    [status],
  );
  const microsoftSnapshot: CalendarProviderStatusSnapshot | null = useMemo(
    () => (msStatus ? statusSnapshotFromApi("microsoft", msStatus) : null),
    [msStatus],
  );
  const googleSnapshotRef = useRef(googleSnapshot);
  const microsoftSnapshotRef = useRef(microsoftSnapshot);
  googleSnapshotRef.current = googleSnapshot;
  microsoftSnapshotRef.current = microsoftSnapshot;

  const googleDisplayHealth = connectionHealthForProvider(googleSnapshot, weekFetchOutcomes);
  const microsoftDisplayHealth = connectionHealthForProvider(microsoftSnapshot, weekFetchOutcomes);

  const isCalendarConnected = hasAnyConnectedProvider(googleSnapshot, microsoftSnapshot);
  const isCalendarUsable = hasAnyHealthyProvider(googleSnapshot, microsoftSnapshot);

  const googleOAuthConfigured =
    status?.oauth_configured ?? oauthCfg?.google.oauth_configured ?? opsHealth?.google_calendar_configured ?? false;
  const microsoftOAuthConfigured =
    msStatus?.oauth_configured ?? oauthCfg?.microsoft.oauth_configured ?? opsHealth?.microsoft_calendar_configured ?? false;

  const fetchInterviewRows = useCallback(
    async (token: string) => {
      const q = showCancelledInterviews ? "?include_cancelled=true" : "";
      const rows = await apiFetch<ScheduledInterview[]>(
        `/api/v1/calendar/me/interviews${q}`,
        { preserveSessionOnUnauthorized: true, timeoutMs: CALENDAR_FETCH_TIMEOUT_MS },
        token,
      );
      setInterviews(rows);
    },
    [showCancelledInterviews],
  );

  const scheduleDebouncedInterviewRefresh = useCallback(() => {
      if (pageHidden) return;
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
    [fetchInterviewRows, pageHidden],
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
      setLoading(false);
      setGoogleStatusPhase("ready");
      setMicrosoftStatusPhase("ready");
      const next = encodeURIComponent(candidateCalendarHref());
      router.replace(`${LOGIN_PATH.candidate}?next=${next}`);
      return;
    }
    const requestId = ++loadRequestIdRef.current;
    const isStale = () => requestId !== loadRequestIdRef.current;

    setLoading(true);
    setGoogleStatusPhase("loading");
    setMicrosoftStatusPhase("loading");
    setActionError(false);
    setGoogleStatusError(false);
    setMicrosoftStatusError(false);
    setNotifPrefsLoadError(false);
    debugCalendarLog("load_start", { requestId });

    const applyGoogleFailure = (timedOut: boolean) => {
      setGoogleStatusError(!timedOut);
      setStatus((prev) => {
        if (prev?.connected) {
          return { ...prev, health: "temporary_error", message: prev.message ?? null };
        }
        return {
          connected: false,
          health: timedOut ? "temporary_error" : undefined,
          google_email: null,
        };
      });
    };

    const applyMicrosoftFailure = (timedOut: boolean) => {
      setMicrosoftStatusError(!timedOut);
      setMsStatus((prev) => {
        if (prev?.connected) {
          return { ...prev, health: "temporary_error", message: prev.message ?? null };
        }
        return {
          connected: false,
          health: timedOut ? "temporary_error" : undefined,
          microsoft_email: null,
        };
      });
    };

    const loadGoogleStatus = async (): Promise<ProviderStatusPhase> => {
      try {
        const s = await apiFetch<CalendarStatus>(
          "/api/v1/calendar/google/status",
          { preserveSessionOnUnauthorized: true, timeoutMs: CALENDAR_FETCH_TIMEOUT_MS },
          token,
        );
        if (!isStale()) {
          setStatus(s);
          setGoogleStatusError(false);
          setGoogleStatusPhase("ready");
          debugCalendarLog("google_status_ready", { requestId });
        }
        return "ready";
      } catch (e) {
        const timedOut = isFetchTimeoutError(e);
        if (!isStale()) {
          applyGoogleFailure(timedOut);
          setGoogleStatusPhase(timedOut ? "timeout" : "error");
          debugCalendarLog("google_status_terminal", { requestId, timedOut });
        }
        console.warn("[calendar] google status failed", e);
        return timedOut ? "timeout" : "error";
      }
    };

    const loadMicrosoftStatus = async (): Promise<ProviderStatusPhase> => {
      try {
        const msRaw = await apiFetch<MicrosoftCalendarStatus>(
          "/api/v1/calendar/microsoft/status",
          { preserveSessionOnUnauthorized: true, timeoutMs: CALENDAR_FETCH_TIMEOUT_MS },
          token,
        );
        if (!isStale()) {
          setMsStatus(msRaw);
          setMicrosoftStatusError(false);
          setMicrosoftStatusPhase("ready");
          debugCalendarLog("microsoft_status_ready", { requestId });
        }
        return "ready";
      } catch (e) {
        const timedOut = isFetchTimeoutError(e);
        if (!isStale()) {
          applyMicrosoftFailure(timedOut);
          setMicrosoftStatusPhase(timedOut ? "timeout" : "error");
          debugCalendarLog("microsoft_status_terminal", { requestId, timedOut });
        }
        console.warn("[calendar] microsoft status failed", e);
        return timedOut ? "timeout" : "error";
      }
    };

    const statusPromise = Promise.all([loadGoogleStatus(), loadMicrosoftStatus()]);

    const [oauthCfgRes, opsRes, meRes] = await Promise.all([
      apiFetch<CalendarOAuthConfig>("/api/v1/calendar/oauth-config", { timeoutMs: CALENDAR_FETCH_TIMEOUT_MS }).catch(
        () => null,
      ),
      fetchOpsHealth(CALENDAR_FETCH_TIMEOUT_MS).catch(() => null),
      apiFetch<AuthMeOut>("/api/v1/auth/me", { timeoutMs: CALENDAR_FETCH_TIMEOUT_MS }, token).catch(() => null),
      statusPromise,
    ]);

    if (isStale()) {
      debugCalendarLog("load_stale_discarded", { requestId });
      return;
    }

    setOauthCfg(oauthCfgRes);
    setOpsHealth(opsRes);

    if (oauthCfgRes) {
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              oauth_configured: prev.oauth_configured ?? oauthCfgRes.google.oauth_configured,
              oauth_redirect_uri: prev.oauth_redirect_uri ?? oauthCfgRes.google.redirect_uri ?? null,
            }
          : prev,
      );
      setMsStatus((prev) =>
        prev
          ? {
              ...prev,
              oauth_configured: prev.oauth_configured ?? oauthCfgRes.microsoft.oauth_configured,
              oauth_redirect_uri: prev.oauth_redirect_uri ?? oauthCfgRes.microsoft.redirect_uri ?? null,
            }
          : prev,
      );
    }

    if (meRes) {
      setEmailProductUpdates(Boolean(meRes.email_product_updates));
      setEmailInterviewReminders(Boolean(meRes.email_interview_reminders));
    } else {
      setNotifPrefsLoadError(true);
    }

    setLoading(false);
    debugCalendarLog("load_complete", { requestId });

    void fetchInterviewRows(token).catch((e) => {
      console.warn("[calendar] interview list failed", e);
      setInterviews([]);
    });
  }, [router, fetchInterviewRows]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const fetchCalendarWeekEvents = useCallback(async () => {
    const googleSnap = googleSnapshotRef.current;
    const microsoftSnap = microsoftSnapshotRef.current;
    const providers = healthyProvidersToFetch(googleSnap, microsoftSnap);
    if (!providers.length) {
      setDisplayEvents(mergeProviderAndTwinEvents([], interviews, weekStart));
      setEventsLoadError(false);
      setEventsPhase("idle");
      setWeekShowEmpty(false);
      setWeekShowReconnectPanel(
        Boolean(
          providerNeedsReconnect(googleSnap) ||
            providerNeedsReconnect(microsoftSnap) ||
            providerNeedsAttention(googleSnap) ||
            providerNeedsAttention(microsoftSnap),
        ),
      );
      setWeekShowPartialWarning(false);
      setWeekFailedProviders([]);
      setWeekFetchOutcomes([]);
      setEventsLoading(false);
      debugCalendarLog("events_skip_not_connected");
      return;
    }
    const token = getToken();
    if (!token) return;
    const requestId = ++eventsRequestIdRef.current;
    const isLatest = () => requestId === eventsRequestIdRef.current;
    const { timeMin, timeMax } = weekRangeIso(weekStart);
    setEventsLoading(true);
    setEventsPhase("loading");
    setEventsLoadError(false);
    setWeekShowReconnectPanel(false);
    setWeekShowPartialWarning(false);
    setWeekShowEmpty(false);
    setWeekFailedProviders([]);
    setWeekFetchOutcomes([]);
    debugCalendarLog("events_fetch_start", { requestId, providers: providers.join(",") });
    try {
      const params = new URLSearchParams({ time_min: timeMin, time_max: timeMax });
      const settled = await Promise.allSettled(
        providers.map(async (provider): Promise<ProviderWeekFetchOutcome> => {
          try {
            const out = await apiFetch<CalendarEventsPayload>(
              `/api/v1/calendar/${provider}/events?${params.toString()}`,
              { preserveSessionOnUnauthorized: true, timeoutMs: CALENDAR_FETCH_TIMEOUT_MS },
              token,
            );
            return {
              provider,
              events: out.events,
              failed: false,
              reconnectRequired: false,
              temporaryError: false,
              timedOut: false,
              message: null,
            };
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            const timedOut = isFetchTimeoutError(e);
            const parsed = parseProviderIntegrationError(msg);
            logCalendarOperationDiagnostic(diagnosticFromErrorMessage(provider, "events_read", msg));
            return {
              provider,
              events: [],
              failed: true,
              reconnectRequired: parsed.reconnectRequired,
              temporaryError: timedOut || parsed.temporaryError,
              timedOut,
              message: msg,
            };
          }
        }),
      );
      const outcomes: ProviderWeekFetchOutcome[] = settled.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        const provider = providers[index] ?? "google";
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        return {
          provider,
          events: [],
          failed: true,
          reconnectRequired: false,
          temporaryError: true,
          timedOut: isFetchTimeoutError(result.reason),
          message: msg,
        };
      });
      if (!isLatest()) {
        debugCalendarLog("events_stale_discarded", { requestId });
        return;
      }
      const aggregate = aggregateWeekEventOutcomes(outcomes, googleSnap, microsoftSnap);
      const loadError = aggregate.allHealthyProvidersFailed && !aggregate.showReconnectPanel;
      const anyTimeout = outcomes.some((o) => o.timedOut);
      const anyTemporaryFailure = outcomes.some((o) => o.temporaryError);
      setWeekFetchOutcomes(outcomes);
      setDisplayEvents(mergeProviderAndTwinEvents(aggregate.events, interviews, weekStart));
      setWeekShowEmpty(aggregate.showEmptyWeek);
      setWeekShowReconnectPanel(aggregate.showReconnectPanel);
      setWeekShowPartialWarning(aggregate.showPartialWarning);
      setWeekFailedProviders(aggregate.failedProviders);
      setEventsLoadError(loadError);
      setEventsPhase(
        eventsPhaseFromFlags({
          loading: false,
          loadError,
          showReconnectPanel: aggregate.showReconnectPanel,
          showEmptyWeek: aggregate.showEmptyWeek,
          hasEvents: aggregate.events.length > 0,
          showPartialWarning: aggregate.showPartialWarning,
          anyTemporaryFailure,
          anyTimeout,
        }),
      );
      debugCalendarLog("events_fetch_complete", {
        requestId,
        reconnect: aggregate.showReconnectPanel,
        empty: aggregate.showEmptyWeek,
      });
    } catch (e) {
      if (isLatest()) {
        const timedOut = isFetchTimeoutError(e);
        setEventsLoadError(true);
        setEventsPhase(timedOut ? "timeout" : "error");
        setDisplayEvents(mergeProviderAndTwinEvents([], interviews, weekStart));
      }
      console.warn("[calendar] week events fetch failed", e);
    } finally {
      if (isLatest()) {
        setEventsLoading(false);
      }
    }
  }, [weekStart, interviews]);

  useEffect(() => {
    if (!statusBootstrapComplete || !isCalendarConnected) return;
    queueMicrotask(() => {
      void fetchCalendarWeekEvents();
    });
  }, [statusBootstrapComplete, isCalendarConnected, fetchCalendarWeekEvents]);

  useEffect(() => {
    queueMicrotask(() => {
      const c = searchParams.get("calendar_connected");
      const err = searchParams.get("calendar_error");
      setCalendarErrorCode(err);
      if (c === "1" || c === "microsoft") {
        const queryKey = searchParams.toString();
        if (calendarConnectedQueryRef.current === queryKey) return;
        calendarConnectedQueryRef.current = queryKey;
        setBanner("connected");
        setWeekShowReconnectPanel(false);
        setWeekShowPartialWarning(false);
        setGoogleStatusError(false);
        setMicrosoftStatusError(false);
        void (async () => {
          await load();
          await fetchCalendarWeekEvents();
        })();
      } else if (err === "google_denied" || err === "microsoft_denied") setBanner("denied");
      else if (err) setBanner("error");
    });
  }, [searchParams, load, fetchCalendarWeekEvents]);

  useEffect(() => {
    if (banner !== "connected") return;
    const timer = window.setTimeout(() => {
      setBanner(null);
      const params = new URLSearchParams(searchParams.toString());
      if (!params.has("calendar_connected")) return;
      params.delete("calendar_connected");
      params.delete("calendar_error");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [banner, pathname, router, searchParams]);

  const calendarErrorMessage = (() => {
    if (!calendarErrorCode) return null;
    const map: Record<string, TranslationKey> = {
      google_denied: "dashboard.calendarErrorGoogleDenied",
      microsoft_denied: "dashboard.calendarErrorMicrosoftDenied",
      exchange_failed: "dashboard.calendarErrorExchange",
      no_refresh_token: "dashboard.calendarErrorNoRefresh",
      invalid_state: "dashboard.calendarErrorInvalidState",
    };
    const key = map[calendarErrorCode];
    return key ? t(key) : t("dashboard.calendarErrorGeneric");
  })();

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
    if (stored) queueMicrotask(() => setWebcalUrl(stored));
  }, []);

  async function subscribeWebcalOneClick() {
    const token = getToken();
    if (!token) return;
    setActionBusy("webcal");
    setActionError(false);
    try {
      const out = await mintAndOpenWebcalSubscribe(token);
      setWebcalUrl(out.webcal_url);
      setWebcalExpiresAt(out.expires_at);
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
    setActionBusy("webcal-regen");
    setActionError(false);
    try {
      const out = await mintWebcalFeed(token);
      setWebcalUrl(out.webcal_url);
      setWebcalExpiresAt(out.expires_at);
      persistWebcalUrl(out.webcal_url);
    } catch (e) {
      setActionError(true);
      console.warn("[calendar] webcal mint failed", e);
    } finally {
      setActionBusy(null);
    }
  }

  async function copyWebcalLink() {
    const token = getToken();
    if (!token) return;
    setActionBusy("webcal-copy");
    setActionError(false);
    try {
      let url = webcalUrl;
      if (!url) {
        const out = await mintWebcalFeed(token);
        url = out.webcal_url;
        setWebcalUrl(url);
        setWebcalExpiresAt(out.expires_at);
        persistWebcalUrl(url);
      }
      await navigator.clipboard.writeText(webcalToHttps(url));
      setWebcalLinkCopied(true);
      window.setTimeout(() => setWebcalLinkCopied(false), 2400);
    } catch (e) {
      setActionError(true);
      console.warn("[calendar] webcal copy failed", e);
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
    return preferredActiveProvider(googleSnapshot, microsoftSnapshot);
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
      void fetchCalendarWeekEvents();
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
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("dashboard.calendarProvidersEyebrow")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">
              {t("dashboard.calendarPageTitle")}
            </h1>
            <WorkspaceStatusBadge status="live" />
          </div>
          <p className="twin-muted mt-2 max-w-prose text-sm leading-relaxed">
            {isCalendarConnected ? t("dashboard.calendarPageLead") : t("dashboard.calendarPageLeadDisconnected")}
          </p>
        </div>
        <CandidateWorkspaceSubnav ariaLabel={t("dashboard.calendarPageTitle")} />
      </div>
      <WorkspaceFlowSteps current="dashboard" className="mb-4 sm:mb-6" />
      <Link href="/dashboard" className="twin-btn-secondary twin-touch-target mb-6 inline-block !w-auto text-sm">
        {t("dashboard.calendarBackDashboard")}
      </Link>

      {banner === "connected" ? <CalendarConnectedSuccessAlert /> : null}
      {banner === "denied" ? (
        <Card variant="soft" className="mb-4">
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.calendarOAuthDenied")}</p>
        </Card>
      ) : null}
      {banner === "error" ? (
        <Card variant="soft" className="mb-4">
          <p className="text-sm text-[var(--twin-muted-strong)]">{calendarErrorMessage}</p>
        </Card>
      ) : null}
      {actionError ? (
        <Card variant="soft" className="mb-4">
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.calendarActionFailedRetry")}</p>
        </Card>
      ) : null}

      {loading && !statusBootstrapComplete ? (
        <p className="mb-6 text-sm text-[var(--twin-muted-strong)]">{t("dashboard.calendarStatusLoading")}</p>
      ) : isCalendarConnected ? (
        <CalendarWeekView
          weekStart={weekStart}
          events={displayEvents}
          loading={eventsLoading}
          loadError={eventsLoadError}
          eventsPhase={eventsPhase}
          showEmptyWeek={weekShowEmpty}
          showReconnectPanel={weekShowReconnectPanel}
          showPartialWarning={weekShowPartialWarning}
          failedProviders={weekFailedProviders}
          onRetryEvents={() => {
            void fetchCalendarWeekEvents();
          }}
          accountEmail={
            googleSnapshot?.connected && googleDisplayHealth === "ok"
              ? googleSnapshot.email
              : microsoftSnapshot?.connected && microsoftDisplayHealth === "ok"
                ? microsoftSnapshot.email
                : status?.google_email ?? msStatus?.microsoft_email ?? null
          }
          providerLabel={calendarProviderLabel(activeCalendarProvider(), t)}
          onPrevWeek={() => setWeekStart((w) => startOfWeekMonday(new Date(w.getTime() - 7 * 24 * 60 * 60 * 1000)))}
          onNextWeek={() => setWeekStart((w) => startOfWeekMonday(new Date(w.getTime() + 7 * 24 * 60 * 60 * 1000)))}
          onToday={() => setWeekStart(startOfWeekMonday(new Date()))}
        />
      ) : (
        <Card className="mb-6 border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/50">
          <h2 className="text-base font-semibold text-[var(--foreground)]">{t("dashboard.calendarConnectHeroTitle")}</h2>
          <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("dashboard.calendarConnectHeroBody")}</p>
        </Card>
      )}

      <CalendarConnectionsPanel
        googleStatusPhase={googleStatusPhase}
        microsoftStatusPhase={microsoftStatusPhase}
        googleStatusError={googleStatusError}
        microsoftStatusError={microsoftStatusError}
        actionBusy={actionBusy}
        google={{
          connected: Boolean(status?.connected),
          health: googleDisplayHealth ?? googleSnapshot?.health,
          message: googleSnapshot?.message ?? null,
          email: status?.google_email ?? null,
          oauthConfigured: googleOAuthConfigured,
        }}
        microsoft={{
          connected: Boolean(msStatus?.connected),
          health: microsoftDisplayHealth ?? microsoftSnapshot?.health,
          message: microsoftSnapshot?.message ?? null,
          email: msStatus?.microsoft_email ?? null,
          oauthConfigured: microsoftOAuthConfigured,
        }}
        webcal={{
          url: webcalUrl,
          expiresAt: webcalExpiresAt,
          linkCopied: webcalLinkCopied,
        }}
        locale={loc}
        onConnectGoogle={() => void connect()}
        onDisconnectGoogle={() => void disconnect()}
        onConnectMicrosoft={() => void connectMicrosoft()}
        onDisconnectMicrosoft={() => void disconnectMicrosoft()}
        onSubscribeWebcal={() => void subscribeWebcalOneClick()}
        onCopyWebcalLink={() => void copyWebcalLink()}
        onGenerateWebcalLink={() => void generateWebcalLink()}
        onRetryCalendarEvents={() => void fetchCalendarWeekEvents()}
        onRetryCalendarStatus={() => {
          void (async () => {
            await load();
            await fetchCalendarWeekEvents();
          })();
        }}
      />

      <CalendarOperatingEvidenceSection />

      <details className="mb-6 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/40 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
          {t("dashboard.calendarNotifSectionTitle")}
        </summary>
        <div className="mt-4">
        <h2 className="sr-only">{t("dashboard.calendarNotifSectionTitle")}</h2>
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
        </div>
      </details>

      {!statusBootstrapComplete ? null : !loading && isCalendarUsable ? (
        <div className="flex flex-col gap-6">
          <details className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/40 px-4 py-3" open>
            <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
              {t("dashboard.calendarInterviewsTitle")}
            </summary>
            <div className="mt-4">
            <h2 className="sr-only">{t("dashboard.calendarInterviewsTitle")}</h2>
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
                        {row.timezone?.trim() ? (
                          <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-[var(--twin-muted)]">
                            {t("dashboard.calendarInterviewTimezone").replace("{tz}", row.timezone.trim())}
                          </span>
                        ) : null}
                      </span>
                      {row.meeting_link?.trim() ? (
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          {(() => {
                            const prov = detectMeetingProvider(row.meeting_link);
                            const labelKey = meetingProviderLabelKey(prov);
                            return labelKey ? (
                              <span className="rounded bg-[var(--twin-surface-raised)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                                {t(labelKey)}
                              </span>
                            ) : null;
                          })()}
                          <a
                            href={row.meeting_link.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="twin-link text-xs font-medium"
                          >
                            {t("dashboard.calendarNextInterviewJoinLink")}
                          </a>
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-center">
                      {row.status !== "cancelled" ? (
                        <>
                          <button
                            type="button"
                            className="twin-btn-secondary !w-auto px-2 py-1 text-xs"
                            onClick={() =>
                              setPrepInterview({
                                id: row.id,
                                title: `${row.company_name} — ${row.job_title}`,
                              })
                            }
                          >
                            {t("careerAssistant.interviewPrep")}
                          </button>
                          <button
                            type="button"
                            className="twin-btn-secondary !w-auto px-2 py-1 text-xs"
                            onClick={() =>
                              setFollowUpInterview({
                                id: row.id,
                                title: `${row.company_name} — ${row.job_title}`,
                              })
                            }
                          >
                            {t("careerAssistant.followUpEmail")}
                          </button>
                        </>
                      ) : null}
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
          </details>

          <details className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/40 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
              {t("dashboard.calendarScheduleTitle")}
            </summary>
            <div className="mt-4">
            <h2 className="sr-only">{t("dashboard.calendarScheduleTitle")}</h2>
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
          </details>

          <details className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/40 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
              {t("dashboard.calendarAdvancedSummary")}
            </summary>
            <div className="mt-4 flex flex-col gap-6">
            <div>
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

            <div>
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
          </details>
        </div>
      ) : null}
      <InterviewPrepModal
        interviewId={prepInterview?.id ?? null}
        title={prepInterview?.title ?? ""}
        open={prepInterview !== null}
        onClose={() => setPrepInterview(null)}
      />
      <FollowUpModal
        interviewId={followUpInterview?.id ?? null}
        title={followUpInterview?.title ?? ""}
        open={followUpInterview !== null}
        onClose={() => setFollowUpInterview(null)}
      />
    </Shell>
  );
}
