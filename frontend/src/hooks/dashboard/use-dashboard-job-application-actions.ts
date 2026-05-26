"use client";

import {
  useCallback,
  useState,
  type MutableRefObject,
} from "react";
import toast from "react-hot-toast";
import type { ApplicationRow } from "@/components/applications-panel";
import {
  dashboardFetchUserMessage,
  type DevelopmentFocus,
} from "@/components/dashboard/dashboard-helpers";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";

type Translator = (key: TranslationKey) => string;

type TrackLinkOpened = (jobId: number) => void | Promise<void>;

interface UseDashboardJobApplicationActionsArgs {
  t: Translator;
  setError: (msg: string | null) => void;
  loadApplications: (
    token: string,
  ) => Promise<{ items: ApplicationRow[]; total: number }>;
  loadDevelopmentFocus: (token: string) => Promise<DevelopmentFocus | null>;
  syncApplicationsFromApi: (payload: {
    items: ApplicationRow[];
    total: number;
  }) => void;
  setDevFocus: (focus: DevelopmentFocus | null) => void;
  /**
   * Ref-injected `trackLinkOpened` so `applyToJob` can call into the
   * job-list hook's link-tracker without forcing a hook-order cycle
   * (the job-list hook needs `setJobApplication` from us). The page
   * keeps `trackLinkOpenedRef.current` in sync each render.
   */
  trackLinkOpenedRef: MutableRefObject<TrackLinkOpened | null>;
}

/**
 * Bundles the candidate dashboard's "send an application" surface —
 * `setJobApplication` (manual tracker), `applyToJob` (external link
 * + `trackLinkOpened`), `autoApplyToJob` (auto-apply pipeline), and
 * the `autoApplyingId` busy lock — into a single hook so the page
 * only owns composition. Mirrors the original behaviour 1:1: same
 * endpoints (`POST /api/v1/applications/`,
 * `POST /api/v1/applications/auto-apply`), same payloads, same
 * `Idempotency-Key` minting, same refresh chain
 * (`syncApplicationsFromApi(loadApplications) →
 * setDevFocus(loadDevelopmentFocus)`), same toasts, same error
 * mapping via `dashboardFetchUserMessage`, same `window.open` flags
 * (`"_blank"`, `"noopener,noreferrer"`), same `package_pdf_url`
 * follow-up.
 *
 * Note: this hook intentionally does NOT own bookmark / dismiss /
 * link-open tracking / paginated jobs feed — those stay on
 * `useDashboardJobListActions`. `trackLinkOpened` is injected via
 * a ref to keep `applyToJob` byte-identical without creating a
 * hook-order cycle.
 */
export function useDashboardJobApplicationActions({
  t,
  setError,
  loadApplications,
  loadDevelopmentFocus,
  syncApplicationsFromApi,
  setDevFocus,
  trackLinkOpenedRef,
}: UseDashboardJobApplicationActionsArgs) {
  const [autoApplyingId, setAutoApplyingId] = useState<number | null>(null);

  const setJobApplication = useCallback(
    async (jobId: number, status: string) => {
      const token = getToken();
      if (!token) return;
      try {
        const idem =
          typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : "";
        const h = new Headers();
        if (idem) h.set("Idempotency-Key", idem);
        await apiFetch(
          "/api/v1/applications/",
          {
            method: "POST",
            body: JSON.stringify({ job_id: jobId, status }),
            headers: h,
          },
          token,
        );
        syncApplicationsFromApi(await loadApplications(token));
        setDevFocus(await loadDevelopmentFocus(token));
        if (status === "applied") {
          toast.success(t("dashboard.applicationTrackedAppliedToast"));
        }
      } catch (err) {
        setError(dashboardFetchUserMessage(err, t));
      }
    },
    [
      t,
      setError,
      syncApplicationsFromApi,
      loadApplications,
      setDevFocus,
      loadDevelopmentFocus,
    ],
  );

  const applyToJob = useCallback(
    (jobId: number, url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
      const tracker = trackLinkOpenedRef.current;
      if (tracker) void tracker(jobId);
    },
    [trackLinkOpenedRef],
  );

  const autoApplyToJob = useCallback(
    async (jobId: number) => {
      const token = getToken();
      if (!token) return;
      setAutoApplyingId(jobId);
      setError(null);
      try {
        const result = await apiFetch<{
          success: boolean;
          message: string;
          package_pdf_url?: string | null;
        }>(
          "/api/v1/applications/auto-apply",
          {
            method: "POST",
            body: JSON.stringify({
              job_id: jobId,
              human_acknowledged: true,
            }),
          },
          token,
        );
        syncApplicationsFromApi(await loadApplications(token));
        setDevFocus(await loadDevelopmentFocus(token));
        toast.success(result.message);
        if (result.package_pdf_url) {
          window.open(
            result.package_pdf_url,
            "_blank",
            "noopener,noreferrer",
          );
        }
      } catch (err) {
        setError(dashboardFetchUserMessage(err, t));
      } finally {
        setAutoApplyingId(null);
      }
    },
    [
      t,
      setError,
      syncApplicationsFromApi,
      loadApplications,
      setDevFocus,
      loadDevelopmentFocus,
    ],
  );

  return {
    autoApplyingId,
    setJobApplication,
    applyToJob,
    autoApplyToJob,
  } as const;
}
