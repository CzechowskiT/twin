"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { csvExportUserMessage } from "@/components/dashboard/dashboard-helpers";
import { apiFetch, apiFetchBlob, saveBlobAsFile } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import {
  dashboardMatchesExportQuery,
  dashboardMatchesExportXlsxQuery,
} from "@/lib/matching-quality";

type Translator = (key: TranslationKey) => string;

interface UseDashboardExportsArgs {
  t: Translator;
  setError: (msg: string | null) => void;
}

/**
 * Bundles all dashboard "download" actions (applications CSV/XLSX,
 * matches CSV/XLSX, full "my data" JSON) and their busy flags into a
 * single hook so the page does not have to track five mostly-identical
 * blob/json-export state machines.
 */
export function useDashboardExports({ t, setError }: UseDashboardExportsArgs) {
  const [applicationsCsvBusy, setApplicationsCsvBusy] = useState(false);
  const [applicationsXlsxBusy, setApplicationsXlsxBusy] = useState(false);
  const [matchesCsvBusy, setMatchesCsvBusy] = useState(false);
  const [matchesXlsxBusy, setMatchesXlsxBusy] = useState(false);
  const [exportJsonBusy, setExportJsonBusy] = useState(false);

  const downloadApplicationsCsv = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setApplicationsCsvBusy(true);
    setError(null);
    try {
      const blob = await apiFetchBlob("/api/v1/applications/me/export.csv", {}, token);
      saveBlobAsFile(blob, "twin-applications.csv");
      toast.success(t("dashboard.applicationsCsvDownloadedToast"));
    } catch (err) {
      setError(csvExportUserMessage(err, t));
    } finally {
      setApplicationsCsvBusy(false);
    }
  }, [t, setError]);

  const downloadApplicationsXlsx = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setApplicationsXlsxBusy(true);
    setError(null);
    try {
      const blob = await apiFetchBlob("/api/v1/applications/me/export.xlsx", {}, token);
      saveBlobAsFile(blob, "twin-applications.xlsx");
      toast.success(t("dashboard.applicationsXlsxDownloadedToast"));
    } catch (err) {
      setError(csvExportUserMessage(err, t));
    } finally {
      setApplicationsXlsxBusy(false);
    }
  }, [t, setError]);

  const downloadMatchesCsv = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setMatchesCsvBusy(true);
    setError(null);
    try {
      const blob = await apiFetchBlob(dashboardMatchesExportQuery(), {}, token);
      saveBlobAsFile(blob, "twin-matches.csv");
      toast.success(t("dashboard.matchesCsvDownloadedToast"));
    } catch (err) {
      setError(csvExportUserMessage(err, t));
    } finally {
      setMatchesCsvBusy(false);
    }
  }, [t, setError]);

  const downloadMatchesXlsx = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setMatchesXlsxBusy(true);
    setError(null);
    try {
      const blob = await apiFetchBlob(dashboardMatchesExportXlsxQuery(), {}, token);
      saveBlobAsFile(blob, "twin-matches.xlsx");
    } catch (err) {
      setError(csvExportUserMessage(err, t));
    } finally {
      setMatchesXlsxBusy(false);
    }
  }, [t, setError]);

  const downloadMyDataJson = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setExportJsonBusy(true);
    setError(null);
    try {
      const data = await apiFetch<Record<string, unknown>>("/api/v1/candidates/me/export.json", {}, token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      saveBlobAsFile(blob, "twin-my-data.json");
    } catch (err) {
      setError(csvExportUserMessage(err, t));
    } finally {
      setExportJsonBusy(false);
    }
  }, [t, setError]);

  return {
    applicationsCsvBusy,
    applicationsXlsxBusy,
    matchesCsvBusy,
    matchesXlsxBusy,
    exportJsonBusy,
    downloadApplicationsCsv,
    downloadApplicationsXlsx,
    downloadMatchesCsv,
    downloadMatchesXlsx,
    downloadMyDataJson,
  } as const;
}
