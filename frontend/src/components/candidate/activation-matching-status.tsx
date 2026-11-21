"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { ACTIVATION_MATCHING_STATUS_ENABLED } from "@/lib/features";

export type ActivationUxState =
  | "matching_in_progress"
  | "matches_ready"
  | "no_matches"
  | "could_not_start"
  | "profile_incomplete"
  | "worker_unavailable"
  | "idle";

export type ActivationStatus = {
  status: string;
  ux_state: ActivationUxState;
  retry_available: boolean;
  match_count: number;
  correlation_id?: string | null;
  failure_category?: string | null;
  auto_matching_enabled?: boolean;
};

type Props = {
  activated: boolean;
  matchCount: number | null;
  onStatusChange?: (status: ActivationStatus | null) => void;
};

const POLL_MS = 2500;
const MAX_POLLS = 24;

export function ActivationMatchingStatus({ activated, matchCount, onStatusChange }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ActivationStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!ACTIVATION_MATCHING_STATUS_ENABLED || !activated) return;
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<ActivationStatus>("/api/v1/candidates/me/activation-status", {}, token);
      setStatus(data);
      onStatusChange?.(data);
    } catch {
      // Keep last known status — do not flash technical errors
    }
  }, [activated, onStatusChange]);

  useEffect(() => {
    if (!ACTIVATION_MATCHING_STATUS_ENABLED || !activated) return;
    const token = getToken();
    if (!token) return;
    // Server-side view event (deduped) — fire-and-forget, does not block paint
    void apiFetch("/api/v1/candidates/me/activation-ttv-view", { method: "POST" }, token).catch(() => undefined);
    let mounted = true;
    queueMicrotask(() => { if (mounted) void load(); });
    return () => { mounted = false; };
  }, [activated, load]);

  const pending = status?.ux_state === "matching_in_progress";
  useEffect(() => {
    if (!ACTIVATION_MATCHING_STATUS_ENABLED || !activated) return;
    if (!pending) return;
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      void load();
      if (n >= MAX_POLLS) window.clearInterval(id);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [activated, pending, load]);

  const onRetry = async () => {
    const token = getToken();
    if (!token || busy) return;
    setBusy(true);
    try {
      const data = await apiFetch<ActivationStatus>(
        "/api/v1/candidates/me/activation-matching/retry",
        { method: "POST" },
        token,
      );
      setStatus(data);
      onStatusChange?.(data);
    } catch {
      // silent — banner stays
    } finally {
      setBusy(false);
    }
  };

  if (!ACTIVATION_MATCHING_STATUS_ENABLED || !activated) return null;

  let displayUx: ActivationUxState = status?.ux_state ?? "idle";
  if (matchCount !== null && matchCount > 0) displayUx = "matches_ready";
  else if (displayUx === "matches_ready" || displayUx === "idle") {
    displayUx = matchCount === 0 ? "no_matches" : "idle";
  }

  const copy = (() => {
    switch (displayUx) {
      case "matching_in_progress":
        return {
          title: t("activationMatching.pendingTitle"),
          body: t("activationMatching.pendingBody"),
        };
      case "matches_ready":
        return {
          title: t("activationMatching.readyTitle"),
          body: t("activationMatching.readyBody"),
        };
      case "no_matches":
        return {
          title: t("activationMatching.emptyTitle"),
          body: t("activationMatching.emptyBody"),
        };
      case "could_not_start":
        return {
          title: t("activationMatching.failedTitle"),
          body: t("activationMatching.failedBody"),
        };
      case "profile_incomplete":
        return {
          title: t("activationMatching.incompleteTitle"),
          body: t("activationMatching.incompleteBody"),
        };
      case "worker_unavailable":
        return {
          title: t("activationMatching.workerTitle"),
          body: t("activationMatching.workerBody"),
        };
      default:
        return null;
    }
  })();

  if (!copy) return null;

  const showRetry = Boolean(status?.retry_available) && !busy;
  const showProfileCta = displayUx === "profile_incomplete" || displayUx === "no_matches";

  return (
    <section
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="rounded-lg border border-[var(--twin-border)]/80 bg-[var(--twin-surface)]/60 p-4 text-sm"
      data-activation-matching-status={displayUx}
    >
      <h2 className="font-semibold text-[var(--twin-fg)]">{copy.title}</h2>
      <p className="twin-muted mt-2 leading-relaxed">{copy.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {showRetry ? (
          <button
            type="button"
            className="twin-btn-secondary twin-touch-target"
            onClick={() => void onRetry()}
            disabled={busy}
          >
            {t("activationMatching.retryCta")}
          </button>
        ) : null}
        {status && !status.retry_available && displayUx === "could_not_start" ? (
          <p className="twin-muted text-xs">{t("activationMatching.retryUnavailable")}</p>
        ) : null}
        {showProfileCta ? (
          <Link href={CANDIDATE_CANONICAL_ROUTES.profile} className="twin-btn-secondary twin-touch-target">
            {t("activationMatching.profileCta")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
