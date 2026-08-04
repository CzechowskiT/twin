"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Approval = {
  id: number;
  approval_kind: string;
  status: string;
  bundled?: boolean;
  before?: { phase?: string; weights?: Record<string, number>; version?: number };
  after?: {
    phase?: string;
    weights?: Record<string, number>;
    from_transition_cal_id?: number | null;
  };
};

type StrategyProposal = {
  id: number;
  status: string;
  bundled?: boolean;
  lifecycle_approval_id?: number | null;
  before_weights?: Record<string, number>;
  after_weights?: Record<string, number>;
  explain?: { silent?: boolean; requires_approval?: boolean };
};

type SearchStrategyPending = {
  id: number;
  title?: string;
  status: string;
  silent_activation?: boolean;
  lifecycle_approval_id?: number | null;
};

export default function LifecycleApprovalsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<Approval[]>([]);
  const [proposals, setProposals] = useState<StrategyProposal[]>([]);
  const [searchPending, setSearchPending] = useState<SearchStrategyPending[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const [life, strat, ss] = await Promise.all([
        apiFetch<{ approvals?: Approval[] }>("/api/v1/candidates/me/career-lifecycle", {}, token),
        apiFetch<{ calibration_proposals?: StrategyProposal[] }>(
          "/api/v1/candidates/me/career-strategy",
          {},
          token,
        ),
        apiFetch<{ strategies?: SearchStrategyPending[] }>(
          "/api/v1/candidates/me/search-strategy",
          {},
          token,
        ),
      ]);
      setItems(life.approvals || []);
      setProposals(strat.calibration_proposals || []);
      setSearchPending(
        (ss.strategies || []).filter((s) => s.status === "pending_approval"),
      );
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerLifecycle.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function resolve(id: number, approved: boolean) {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch(
        `/api/v1/candidates/me/career-lifecycle/approvals/${id}/resolve`,
        { method: "POST", body: JSON.stringify({ approved }) },
        token,
      );
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerLifecycle.actionFailed"));
    }
  }

  async function resolveCalibration(id: number, approved: boolean) {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch(
        `/api/v1/candidates/me/career-strategy/calibration/${id}/resolve`,
        { method: "POST", body: JSON.stringify({ approved }) },
        token,
      );
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerStrategy.actionFailed"));
    }
  }

  async function resolveSearchStrategy(id: number, approved: boolean) {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch(
        `/api/v1/candidates/me/search-strategy/${id}/resolve-activate`,
        { method: "POST", body: JSON.stringify({ approved }) },
        token,
      );
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("searchStrategy.actionFailed"));
    }
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("careerLifecycle.approvals")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="text-3xl font-semibold">{t("careerLifecycle.approvalsTitle")}</h1>
        <p className="text-sm text-[var(--twin-muted)]">{t("careerLifecycle.approvalsLead")}</p>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}

        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("searchStrategy.eyebrow")}</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {searchPending.map((s) => (
              <li
                key={`ss-${s.id}`}
                className="flex flex-col gap-2 border-b border-[var(--twin-border)] py-2"
              >
                <span>
                  search strategy #{s.id} {s.title} · {s.status} · silent_activation=
                  {String(!!s.silent_activation)}
                </span>
                <span className="flex gap-2">
                  <Button type="button" onClick={() => void resolveSearchStrategy(s.id, true)}>
                    {t("searchStrategy.approveActivate")}
                  </Button>
                  <Button type="button" onClick={() => void resolveSearchStrategy(s.id, false)}>
                    {t("careerLifecycle.reject")}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <Link className="twin-link" href="/dashboard/search-strategy">
              {t("searchStrategy.eyebrow")}
            </Link>
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("careerStrategy.calibrationTitle")}</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {proposals.map((p) => (
              <li
                key={`cal-${p.id}`}
                className="flex flex-col gap-2 border-b border-[var(--twin-border)] py-2"
              >
                <span>
                  calibration #{p.id} · {p.status} · bundled={String(!!p.bundled)} · silent=
                  {String(!!p.explain?.silent)}
                </span>
                <pre className="overflow-auto whitespace-pre-wrap text-xs text-[var(--twin-muted)]">
                  {JSON.stringify(
                    { before: p.before_weights, after: p.after_weights },
                    null,
                    2,
                  )}
                </pre>
                {p.status === "pending" ? (
                  <span className="flex gap-2">
                    <Button type="button" onClick={() => void resolveCalibration(p.id, true)}>
                      {t("careerStrategy.approveCalibration")}
                    </Button>
                    <Button type="button" onClick={() => void resolveCalibration(p.id, false)}>
                      {t("careerStrategy.rejectCalibration")}
                    </Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <Link className="twin-link" href="/dashboard/strategy">
              {t("careerStrategy.eyebrow")}
            </Link>
          </p>
        </Card>

        <Card>
          <ul className="flex flex-col gap-3 text-sm">
            {items.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--twin-border)] py-2"
              >
                <span>
                  {a.approval_kind} · {a.status} · bundled={String(!!a.bundled)} ·{" "}
                  {a.before?.phase || a.before?.version} → {a.after?.phase || "weights"}
                </span>
                {a.status === "pending" && a.approval_kind !== "calibration_merge" ? (
                  <span className="flex gap-2">
                    <Button type="button" onClick={() => void resolve(a.id, true)}>
                      {t("careerLifecycle.approve")}
                    </Button>
                    <Button type="button" onClick={() => void resolve(a.id, false)}>
                      {t("careerLifecycle.reject")}
                    </Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </Shell>
  );
}
