"use client";

import { useCallback, useState } from "react";
import type { JobEmployerTabId } from "@/lib/job-employer-demo";

type IntelJob = {
  id: number;
  title: string;
  company: string;
  location: string | null;
} | null;

type InsightsJob = { id: number; title: string } | null;

type EmployerHubJob =
  | {
      id: number;
      title: string;
      company: string;
      location: string | null;
      url?: string;
      initialTab?: JobEmployerTabId;
    }
  | null;

type AppRef = { id: number; title: string } | null;

/**
 * Bundles the dashboard's modal UI state — every <DashboardModals/> field
 * (company intelligence, hiring insights, employer hub, CV optimizer, salary
 * negotiation, LinkedIn optimizer) plus typed open/close helpers. Pure local
 * UI state: no API calls, no payload shaping, no busy machines tied to a
 * network request. Mirrors the original behaviour 1:1 — same field shapes,
 * same open-on-set / close-on-null semantics, same defaults — so
 * <DashboardModals/> keeps its existing props verbatim.
 */
export function useDashboardModals() {
  const [intelJob, setIntelJob] = useState<IntelJob>(null);
  const [insightsJob, setInsightsJob] = useState<InsightsJob>(null);
  const [employerHubJob, setEmployerHubJob] = useState<EmployerHubJob>(null);
  const [cvApp, setCvApp] = useState<AppRef>(null);
  const [negotiateApp, setNegotiateApp] = useState<AppRef>(null);
  const [linkedinOpen, setLinkedinOpen] = useState(false);

  const openIntel = useCallback(
    (id: number, title: string, company: string, location: string | null) => {
      setIntelJob({ id, title, company, location });
    },
    [],
  );
  const closeIntel = useCallback(() => setIntelJob(null), []);

  const openInsights = useCallback((id: number, title: string) => {
    setInsightsJob({ id, title });
  }, []);
  const closeInsights = useCallback(() => setInsightsJob(null), []);

  const openEmployerHub = useCallback((job: NonNullable<EmployerHubJob>) => {
    setEmployerHubJob(job);
  }, []);
  const closeEmployerHub = useCallback(() => setEmployerHubJob(null), []);

  const openCv = useCallback((id: number, title: string) => {
    setCvApp({ id, title });
  }, []);
  const closeCv = useCallback(() => setCvApp(null), []);

  const openNegotiate = useCallback((id: number, title: string) => {
    setNegotiateApp({ id, title });
  }, []);
  const closeNegotiate = useCallback(() => setNegotiateApp(null), []);

  const openLinkedin = useCallback(() => setLinkedinOpen(true), []);
  const closeLinkedin = useCallback(() => setLinkedinOpen(false), []);

  return {
    intelJob,
    insightsJob,
    employerHubJob,
    cvApp,
    negotiateApp,
    linkedinOpen,
    openIntel,
    closeIntel,
    openInsights,
    closeInsights,
    openEmployerHub,
    closeEmployerHub,
    openCv,
    closeCv,
    openNegotiate,
    closeNegotiate,
    openLinkedin,
    closeLinkedin,
  } as const;
}
