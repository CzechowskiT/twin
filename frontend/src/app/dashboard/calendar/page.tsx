"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type CalendarStatus = {
  connected: boolean;
  google_email: string | null;
};

type AuthorizePayload = { authorize_url: string };

type FreeBusyOut = { busy: { start: string; end: string }[] };

type EventOut = { id: string | null; html_link: string | null };

export default function DashboardCalendarPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [banner, setBanner] = useState<"connected" | "denied" | "error" | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  const [freeBusyResult, setFreeBusyResult] = useState<FreeBusyOut | null>(null);
  const [eventResult, setEventResult] = useState<EventOut | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setActionError(false);
    try {
      const s = await apiFetch<CalendarStatus>("/api/v1/calendar/google/status", {}, token);
      setStatus(s);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("401")) {
        clearToken();
        router.replace("/login");
        return;
      }
      setActionError(true);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    const c = searchParams.get("calendar_connected");
    const err = searchParams.get("calendar_error");
    if (c === "1") setBanner("connected");
    else if (err === "google_denied") setBanner("denied");
    else if (err) setBanner("error");
  }, [searchParams]);

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

  async function disconnect() {
    const token = getToken();
    if (!token) return;
    setActionBusy("disconnect");
    setActionError(false);
    try {
      await apiFetch("/api/v1/calendar/google", { method: "DELETE" }, token);
      setFreeBusyResult(null);
      setEventResult(null);
      await load();
    } catch (e) {
      setActionError(true);
      console.warn("[calendar] disconnect failed", e);
    } finally {
      setActionBusy(null);
    }
  }

  async function runFreeBusy() {
    const token = getToken();
    if (!token) return;
    setActionBusy("freebusy");
    setActionError(false);
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    try {
      const out = await apiFetch<FreeBusyOut>(
        "/api/v1/calendar/google/freebusy",
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
    if (!token) return;
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

      {loading ? (
        <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.identityLoading")}</p>
      ) : status?.connected ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.calendarConnected")}</p>
              {status.google_email ? (
                <p className="twin-muted mt-1 text-sm">
                  {t("dashboard.calendarConnectedAs")}: {status.google_email}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              className="twin-btn-secondary twin-touch-target"
              disabled={Boolean(actionBusy)}
              onClick={() => void disconnect()}
            >
              {actionBusy === "disconnect" ? "…" : t("dashboard.calendarDisconnect")}
            </Button>
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
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.calendarNotConnected")}</p>
          <Button type="button" className="twin-touch-target w-fit" disabled={Boolean(actionBusy)} onClick={() => void connect()}>
            {actionBusy === "connect" ? "…" : t("dashboard.calendarConnect")}
          </Button>
        </div>
      )}
    </Shell>
  );
}
