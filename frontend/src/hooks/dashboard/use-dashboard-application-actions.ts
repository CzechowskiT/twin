"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import {
  type ApplicationRow,
  type FeedbackBusy,
  type PlacementEventRow,
  type PlacementFlowBusy,
} from "@/components/applications-panel";
import {
  dashboardFetchUserMessage,
  type DevelopmentFocus,
} from "@/components/dashboard/dashboard-helpers";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";

type Translator = (key: TranslationKey) => string;

interface UseDashboardApplicationActionsArgs {
  t: Translator;
  setError: (msg: string | null) => void;
  loadApplications: (token: string) => Promise<{ items: ApplicationRow[]; total: number }>;
  loadDevelopmentFocus: (token: string) => Promise<DevelopmentFocus | null>;
  syncApplicationsFromApi: (payload: { items: ApplicationRow[]; total: number }) => void;
  setDevFocus: (focus: DevelopmentFocus | null) => void;
  bumpPlacementEventsInvalidateKey: () => void;
}

/**
 * Bundles the ApplicationsPanel mutation handlers (status change, removal,
 * feedback save/parse, auto-apply package open, placement declare/verify/
 * employer-attest/dispute/events load) plus their busy state machines so
 * the dashboard page only owns composition. Mirrors the original behaviour
 * 1:1 — same endpoints, toasts, refresh chain (loadApplications +
 * loadDevelopmentFocus, plus placement-events invalidation).
 */
export function useDashboardApplicationActions({
  t,
  setError,
  loadApplications,
  loadDevelopmentFocus,
  syncApplicationsFromApi,
  setDevFocus,
  bumpPlacementEventsInvalidateKey,
}: UseDashboardApplicationActionsArgs) {
  const [feedbackBusy, setFeedbackBusy] = useState<FeedbackBusy>(null);
  const [placementFlowBusy, setPlacementFlowBusy] = useState<PlacementFlowBusy>(null);

  const refreshApplicationsAndFocus = useCallback(
    async (token: string) => {
      syncApplicationsFromApi(await loadApplications(token));
      setDevFocus(await loadDevelopmentFocus(token));
    },
    [loadApplications, loadDevelopmentFocus, syncApplicationsFromApi, setDevFocus],
  );

  const updateApplicationStatus = useCallback(
    async (id: number, status: string) => {
      const token = getToken();
      if (!token) return;
      await apiFetch(
        `/api/v1/applications/${id}`,
        { method: "PATCH", body: JSON.stringify({ status }) },
        token,
      );
      await refreshApplicationsAndFocus(token);
    },
    [refreshApplicationsAndFocus],
  );

  const removeApplication = useCallback(
    async (id: number) => {
      const token = getToken();
      if (!token) return;
      await apiFetch(`/api/v1/applications/${id}`, { method: "DELETE" }, token);
      await refreshApplicationsAndFocus(token);
    },
    [refreshApplicationsAndFocus],
  );

  const saveApplicationFeedback = useCallback(
    async (id: number, raw: string) => {
      const token = getToken();
      if (!token) return;
      setFeedbackBusy({ id, kind: "save" });
      setError(null);
      try {
        await apiFetch(
          `/api/v1/applications/${id}`,
          { method: "PATCH", body: JSON.stringify({ recruiter_feedback_raw: raw }) },
          token,
        );
        await refreshApplicationsAndFocus(token);
      } catch (err) {
        setError(dashboardFetchUserMessage(err, t));
      } finally {
        setFeedbackBusy(null);
      }
    },
    [t, setError, refreshApplicationsAndFocus],
  );

  const parseApplicationFeedback = useCallback(
    async (id: number) => {
      const token = getToken();
      if (!token) return;
      setFeedbackBusy({ id, kind: "parse" });
      setError(null);
      try {
        await apiFetch(
          `/api/v1/applications/${id}/parse-feedback`,
          { method: "POST", body: "{}" },
          token,
        );
        await refreshApplicationsAndFocus(token);
      } catch (err) {
        setError(dashboardFetchUserMessage(err, t));
      } finally {
        setFeedbackBusy(null);
      }
    },
    [t, setError, refreshApplicationsAndFocus],
  );

  const openAutoApplyPackagePdf = useCallback(
    async (applicationId: number) => {
      const token = getToken();
      if (!token) return;
      setError(null);
      try {
        const data = await apiFetch<{ url: string }>(
          `/api/v1/applications/${applicationId}/auto-apply-package-url`,
          {},
          token,
        );
        window.open(data.url, "_blank", "noopener,noreferrer");
      } catch (err) {
        setError(dashboardFetchUserMessage(err, t));
        toast.error(t("dashboard.autoApplyPackagePdfFailedToast"));
      }
    },
    [t, setError],
  );

  const declarePlacement = useCallback(
    async (applicationId: number, note: string) => {
      const token = getToken();
      if (!token) return;
      setPlacementFlowBusy({ id: applicationId, kind: "declare" });
      setError(null);
      try {
        await apiFetch<ApplicationRow>(
          `/api/v1/applications/${applicationId}/placement-declare`,
          { method: "POST", body: JSON.stringify({ note: note.trim() || null }) },
          token,
        );
        await refreshApplicationsAndFocus(token);
        bumpPlacementEventsInvalidateKey();
      } catch (err) {
        setError(dashboardFetchUserMessage(err, t));
      } finally {
        setPlacementFlowBusy(null);
      }
    },
    [t, setError, refreshApplicationsAndFocus, bumpPlacementEventsInvalidateKey],
  );

  const issuePlacementEmployerAttest = useCallback(
    async (applicationId: number, employerEmail?: string): Promise<string> => {
      const token = getToken();
      if (!token) throw new Error(t("dashboard.placementEventsNotSignedIn"));
      setPlacementFlowBusy({ id: applicationId, kind: "employer_attest" });
      setError(null);
      try {
        const out = await apiFetch<{ attest_url: string; mail_sent: boolean }>(
          `/api/v1/applications/${applicationId}/placement-employer-attest-link`,
          {
            method: "POST",
            body: JSON.stringify({
              ...(employerEmail?.trim() ? { employer_email: employerEmail.trim() } : {}),
            }),
          },
          token,
        );
        bumpPlacementEventsInvalidateKey();
        toast.success(
          out.mail_sent
            ? t("dashboard.placementEmployerAttestEmailed")
            : t("dashboard.placementEmployerAttestCopied"),
        );
        return out.attest_url;
      } catch (err) {
        setError(dashboardFetchUserMessage(err, t));
        throw err;
      } finally {
        setPlacementFlowBusy(null);
      }
    },
    [t, setError, bumpPlacementEventsInvalidateKey],
  );

  const filePlacementDispute = useCallback(
    async (applicationId: number, reason: string) => {
      const token = getToken();
      if (!token) return;
      setPlacementFlowBusy({ id: applicationId, kind: "dispute" });
      setError(null);
      try {
        await apiFetch<ApplicationRow>(
          `/api/v1/applications/${applicationId}/placement-dispute`,
          { method: "POST", body: JSON.stringify({ reason: reason.trim() || null }) },
          token,
        );
        syncApplicationsFromApi(await loadApplications(token));
        bumpPlacementEventsInvalidateKey();
        toast.success(t("dashboard.placementDisputed"));
      } catch (err) {
        setError(dashboardFetchUserMessage(err, t));
      } finally {
        setPlacementFlowBusy(null);
      }
    },
    [
      t,
      setError,
      syncApplicationsFromApi,
      loadApplications,
      bumpPlacementEventsInvalidateKey,
    ],
  );

  const startPlacementVerify = useCallback(
    async (applicationId: number, workEmail: string) => {
      const token = getToken();
      if (!token) return;
      setPlacementFlowBusy({ id: applicationId, kind: "verify" });
      setError(null);
      try {
        const out = await apiFetch<{ mail_sent: boolean; message: string }>(
          `/api/v1/applications/${applicationId}/placement-verify/start`,
          { method: "POST", body: JSON.stringify({ work_email: workEmail }) },
          token,
        );
        await refreshApplicationsAndFocus(token);
        alert(out.message || t("dashboard.placementVerifyPending"));
        bumpPlacementEventsInvalidateKey();
      } catch (err) {
        setError(dashboardFetchUserMessage(err, t));
      } finally {
        setPlacementFlowBusy(null);
      }
    },
    [t, setError, refreshApplicationsAndFocus, bumpPlacementEventsInvalidateKey],
  );

  const loadPlacementEvents = useCallback(
    async (applicationId: number) => {
      const token = getToken();
      if (!token) throw new Error(t("dashboard.placementEventsNotSignedIn"));
      const data = await apiFetch<{ items: PlacementEventRow[]; total: number }>(
        `/api/v1/applications/${applicationId}/placement-events`,
        {},
        token,
      );
      return data.items;
    },
    [t],
  );

  return {
    feedbackBusy,
    placementFlowBusy,
    updateApplicationStatus,
    removeApplication,
    saveApplicationFeedback,
    parseApplicationFeedback,
    openAutoApplyPackagePdf,
    declarePlacement,
    issuePlacementEmployerAttest,
    filePlacementDispute,
    startPlacementVerify,
    loadPlacementEvents,
  } as const;
}
