"use client";

import { useCallback, useState } from "react";
import { dashboardFetchUserMessage } from "@/components/dashboard/dashboard-helpers";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import {
  mintAndOpenWebcalSubscribe,
  mintWebcalFeed,
  persistWebcalUrl,
} from "@/lib/webcal-subscribe";

type Translator = (key: TranslationKey) => string;

interface UseDashboardCalendarActionsArgs {
  t: Translator;
  setError: (msg: string | null) => void;
  setDashboardWebcalUrl: (url: string | null) => void;
}

/**
 * Bundles the DashboardCalendarStrip mutation handlers (Google / Microsoft
 * connect, WebCal mint+open, WebCal refresh) plus their busy state machines
 * (calendarConnectBusy, dashboardWebcalBusy, nextInterviewIcsBusy) so the
 * dashboard page only owns composition. Mirrors the original behaviour 1:1
 * — same endpoints, same redirect via window.location.href, same WebCal
 * helpers (mintAndOpenWebcalSubscribe / mintWebcalFeed + persistWebcalUrl),
 * same error mapping via dashboardFetchUserMessage. nextInterviewIcsBusy is
 * surfaced verbatim because the strip drives the ICS download internally
 * and only consults the boolean + setter for spinner state.
 */
export function useDashboardCalendarActions({
  t,
  setError,
  setDashboardWebcalUrl,
}: UseDashboardCalendarActionsArgs) {
  const [calendarConnectBusy, setCalendarConnectBusy] = useState<
    "google" | "microsoft" | null
  >(null);
  const [dashboardWebcalBusy, setDashboardWebcalBusy] = useState(false);
  const [nextInterviewIcsBusy, setNextInterviewIcsBusy] = useState(false);

  const connectGoogleCalendarFromDashboard = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setCalendarConnectBusy("google");
    setError(null);
    try {
      const res = await apiFetch<{ authorize_url: string }>(
        "/api/v1/calendar/google/authorize",
        {},
        token,
      );
      window.location.href = res.authorize_url;
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setCalendarConnectBusy(null);
    }
  }, [t, setError]);

  const connectMicrosoftCalendarFromDashboard = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setCalendarConnectBusy("microsoft");
    setError(null);
    try {
      const res = await apiFetch<{ authorize_url: string }>(
        "/api/v1/calendar/microsoft/authorize",
        {},
        token,
      );
      window.location.href = res.authorize_url;
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setCalendarConnectBusy(null);
    }
  }, [t, setError]);

  const subscribeDashboardWebcalOneClick = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setDashboardWebcalBusy(true);
    try {
      const out = await mintAndOpenWebcalSubscribe(token);
      setDashboardWebcalUrl(out.webcal_url);
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setDashboardWebcalBusy(false);
    }
  }, [t, setError, setDashboardWebcalUrl]);

  const refreshDashboardWebcalLink = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setDashboardWebcalBusy(true);
    try {
      const out = await mintWebcalFeed(token);
      setDashboardWebcalUrl(out.webcal_url);
      persistWebcalUrl(out.webcal_url);
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setDashboardWebcalBusy(false);
    }
  }, [t, setError, setDashboardWebcalUrl]);

  return {
    calendarConnectBusy,
    dashboardWebcalBusy,
    nextInterviewIcsBusy,
    setNextInterviewIcsBusy,
    connectGoogleCalendarFromDashboard,
    connectMicrosoftCalendarFromDashboard,
    subscribeDashboardWebcalOneClick,
    refreshDashboardWebcalLink,
  } as const;
}
