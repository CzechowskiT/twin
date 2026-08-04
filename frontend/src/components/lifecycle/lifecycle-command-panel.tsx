"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type LifecycleAgg = {
  context?: {
    active_phase?: string;
    proposed_phase?: string | null;
    candidate_phase_confirmed?: boolean;
    focus_type?: string | null;
    focus_ref?: string | null;
    uuid_key?: boolean;
  };
  nba?: { title?: string; deep_link?: string; pending_approvals?: number };
  readiness?: { modules?: Record<string, boolean> };
  approvals?: { id: number; approval_kind: string; status: string; bundled?: boolean }[];
  findings?: { id: number; message: string; severity: string }[];
  phases?: string[];
  alembic?: string;
  safety?: Record<string, unknown>;
};

export function LifecycleCommandPanel() {
  const { t } = useTranslation();
  const [agg, setAgg] = useState<LifecycleAgg | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<LifecycleAgg>("/api/v1/candidates/me/career-lifecycle", {}, token);
      setAgg(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerLifecycle.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function proposeNext() {
    const token = getToken();
    if (!token || !agg?.context?.active_phase || !agg.phases) return;
    const idx = agg.phases.indexOf(agg.context.active_phase);
    const next = agg.phases[Math.min(idx + 1, agg.phases.length - 1)];
    if (next === agg.context.active_phase) return;
    setBusy(true);
    try {
      await apiFetch(
        "/api/v1/candidates/me/career-lifecycle/phase/propose",
        { method: "POST", body: JSON.stringify({ phase: next, reason: "Candidate requested next phase" }) },
        token,
      );
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerLifecycle.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function approveFirst() {
    const token = getToken();
    const pending = (agg?.approvals || []).find((a) => a.status === "pending");
    if (!token || !pending) return;
    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/candidates/me/career-lifecycle/approvals/${pending.id}/resolve`,
        { method: "POST", body: JSON.stringify({ approved: true }) },
        token,
      );
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerLifecycle.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3" data-lifecycle-command-panel>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm uppercase tracking-wide text-[var(--twin-muted)]">
            {t("careerLifecycle.eyebrow")}
          </p>
          <h2 className="text-xl font-semibold">{t("careerLifecycle.commandTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--twin-muted)]">{t("careerLifecycle.lead")}</p>
        </div>
        <p className="rounded-md border border-[var(--twin-border)] px-2 py-1 text-xs" role="status">
          {t("careerLifecycle.phase")}: {agg?.context?.active_phase || "…"}
        </p>
      </div>
      {err ? (
        <p className="text-sm text-red-700" role="alert">
          {err}
        </p>
      ) : null}
      {agg?.nba?.title ? (
        <p className="text-sm">
          <span className="text-[var(--twin-muted)]">{t("careerLifecycle.nba")}: </span>
          <Link className="twin-link" href={agg.nba.deep_link || "/dashboard"}>
            {agg.nba.title}
          </Link>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => void proposeNext()}>
          {t("careerLifecycle.proposePhase")}
        </Button>
        <Button type="button" disabled={busy || !(agg?.approvals || []).some((a) => a.status === "pending")} onClick={() => void approveFirst()}>
          {t("careerLifecycle.approvePending")}
        </Button>
        <Link className="twin-link inline-flex min-h-[2.75rem] items-center text-sm" href="/dashboard/history">
          {t("careerLifecycle.history")}
        </Link>
        <Link className="twin-link inline-flex min-h-[2.75rem] items-center text-sm" href="/dashboard/approvals">
          {t("careerLifecycle.approvals")}
        </Link>
        <Link className="twin-link inline-flex min-h-[2.75rem] items-center text-sm" href="/dashboard/search">
          {t("careerLifecycle.search")}
        </Link>
      </div>
      {agg?.findings?.length ? (
        <ul className="list-inside list-disc text-xs text-[var(--twin-muted)]">
          {agg.findings.slice(0, 3).map((f) => (
            <li key={f.id}>{f.message}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-[var(--twin-muted)]">{t("careerLifecycle.disclaimer")}</p>
    </Card>
  );
}
