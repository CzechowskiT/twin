"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export type VerifiedReadinessChecklist = {
  profile_present: boolean;
  cv_present: boolean;
  career_brief_present: boolean;
  skill_evidence_present: boolean;
  consent_general_present: boolean;
  consent_storage_present: boolean;
};

export type VerifiedReadinessGate = {
  verification_status: string;
  checklist: VerifiedReadinessChecklist;
  missing_items: string[];
  blocked_reasons: string[];
  delegated_apply_allowed: boolean;
  can_prepare_application_package: boolean;
  can_submit_delegated_application: boolean;
};

export type VerifiedReadinessLoadState = "idle" | "loading" | "ready" | "failed";

/**
 * Read-only verified-readiness gate for the dashboard card.
 * Fails open: errors do not block the rest of the dashboard.
 */
export function useDashboardVerifiedReadiness() {
  const [gate, setGate] = useState<VerifiedReadinessGate | null>(null);
  const [loadState, setLoadState] = useState<VerifiedReadinessLoadState>("idle");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setGate(null);
      setLoadState("idle");
      return;
    }
    setLoadState("loading");
    try {
      const res = await apiFetch<VerifiedReadinessGate>(
        "/api/v1/candidates/me/verified-readiness",
        {},
        token,
      );
      setGate(res);
      setLoadState("ready");
    } catch {
      setGate(null);
      setLoadState("failed");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return { gate, loadState, reload: load };
}
