"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { IaActionableEmpty } from "@/components/dashboard/ia-actionable-empty";
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

type OutcomeCalibration = {
  id: number;
  status: string;
  silent?: boolean;
  before_weights?: Record<string, number>;
  after_weights?: Record<string, number>;
};

type StrategyDecision = {
  id: number;
  status: string;
  stale?: boolean;
  silent?: boolean;
  question?: { text?: string };
};

type CommitmentBatch = {
  id: number;
  status: string;
  items?: { id: number }[];
  external_created?: boolean;
};

export default function LifecycleApprovalsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<Approval[]>([]);
  const [proposals, setProposals] = useState<StrategyProposal[]>([]);
  const [searchPending, setSearchPending] = useState<SearchStrategyPending[]>([]);
  const [outcomeCals, setOutcomeCals] = useState<OutcomeCalibration[]>([]);
  const [strategyDecisions, setStrategyDecisions] = useState<StrategyDecision[]>([]);
  const [commitmentBatches, setCommitmentBatches] = useState<CommitmentBatch[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const [life, strat, ss, out, reviews, exec] = await Promise.all([
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
        apiFetch<{ calibrations?: OutcomeCalibration[] }>(
          "/api/v1/candidates/me/search-outcomes",
          {},
          token,
        ),
        apiFetch<{ decisions?: StrategyDecision[] }>(
          "/api/v1/candidates/me/strategy-reviews",
          {},
          token,
        ),
        apiFetch<{ batches?: CommitmentBatch[] }>(
          "/api/v1/candidates/me/execution-calendar",
          {},
          token,
        ),
      ]);
      setItems(
        (life.approvals || []).filter((a) => a.approval_kind !== "strategy_decision_change_set"),
      );
      setProposals(strat.calibration_proposals || []);
      setSearchPending(
        (ss.strategies || []).filter((s) => s.status === "pending_approval"),
      );
      setOutcomeCals((out.calibrations || []).filter((c) => c.status === "pending"));
      setStrategyDecisions(
        (reviews.decisions || []).filter((d) => d.status === "pending_approval"),
      );
      setCommitmentBatches(
        (exec.batches || []).filter((b) => b.status === "pending_approval"),
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

  async function resolveOutcomeCal(id: number, approved: boolean) {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch(
        `/api/v1/candidates/me/search-outcomes/calibrations/${id}/resolve`,
        { method: "POST", body: JSON.stringify({ approved }) },
        token,
      );
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("searchOutcomes.actionFailed"));
    }
  }

  async function resolveStrategyDecision(id: number, action: "approve" | "reject" | "postpone") {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch(
        `/api/v1/candidates/me/strategy-reviews/decisions/${id}/resolve`,
        { method: "POST", body: JSON.stringify({ action }) },
        token,
      );
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("decisionJournal.actionFailed"));
    }
  }

  async function resolveCommitmentBatch(id: number, action: "approve" | "reject" | "postpone") {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch(
        `/api/v1/candidates/me/execution-calendar/batches/${id}/resolve`,
        { method: "POST", body: JSON.stringify({ action }) },
        token,
      );
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("executionCalendar.actionFailed"));
    }
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("careerLifecycle.approvals")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="text-3xl font-semibold">{t("careerLifecycle.approvalsTitle")}</h1>
        <p className="text-sm text-[var(--twin-muted)]">{t("careerLifecycle.approvalsLead")}</p>
        <IaActionableEmpty areaId="decisions" show />
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}

        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("executionCalendar.batchesTitle")}</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {commitmentBatches.map((b) => (
              <li
                key={`batch-${b.id}`}
                className="flex flex-col gap-2 border-b border-[var(--twin-border)] py-2"
              >
                <span>
                  commitment batch #{b.id} · {b.status} · items={b.items?.length ?? 0} ·
                  external_created={String(!!b.external_created)}
                </span>
                <span className="flex gap-2">
                  <Button type="button" onClick={() => void resolveCommitmentBatch(b.id, "approve")}>
                    {t("executionCalendar.approve")}
                  </Button>
                  <Button type="button" onClick={() => void resolveCommitmentBatch(b.id, "reject")}>
                    {t("executionCalendar.reject")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void resolveCommitmentBatch(b.id, "postpone")}
                  >
                    {t("executionCalendar.postpone")}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <Link className="twin-link" href="/dashboard/execution-calendar">
              {t("executionCalendar.eyebrow")}
            </Link>
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("searchOutcomes.calibrationTitle")}</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {outcomeCals.map((c) => (
              <li
                key={`ocal-${c.id}`}
                className="flex flex-col gap-2 border-b border-[var(--twin-border)] py-2"
              >
                <span>
                  search-outcome calibration #{c.id} · {c.status} · silent=
                  {String(!!c.silent)}
                </span>
                <span className="flex gap-2">
                  <Button type="button" onClick={() => void resolveOutcomeCal(c.id, true)}>
                    {t("searchOutcomes.approveCalibration")}
                  </Button>
                  <Button type="button" onClick={() => void resolveOutcomeCal(c.id, false)}>
                    {t("searchOutcomes.rejectCalibration")}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <Link className="twin-link" href="/dashboard/search-outcomes">
              {t("searchOutcomes.eyebrow")}
            </Link>
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("decisionJournal.listTitle")}</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {strategyDecisions.map((d) => (
              <li
                key={`sdec-${d.id}`}
                className="flex flex-col gap-2 border-b border-[var(--twin-border)] py-2"
              >
                <span>
                  strategy decision #{d.id} · {d.status} · stale={String(!!d.stale)} · silent=
                  {String(!!d.silent)}
                </span>
                <span className="text-[var(--twin-muted)]">{d.question?.text}</span>
                <span className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={!!d.stale}
                    onClick={() => void resolveStrategyDecision(d.id, "approve")}
                  >
                    {t("decisionJournal.approve")}
                  </Button>
                  <Button type="button" onClick={() => void resolveStrategyDecision(d.id, "reject")}>
                    {t("decisionJournal.reject")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void resolveStrategyDecision(d.id, "postpone")}
                  >
                    {t("decisionJournal.postpone")}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <Link className="twin-link" href="/dashboard/decision-journal">
              {t("decisionJournal.eyebrow")}
            </Link>
            {" · "}
            <Link className="twin-link" href="/dashboard/review-center">
              {t("reviewCenter.eyebrow")}
            </Link>
          </p>
        </Card>

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
                {a.status === "pending" &&
                a.approval_kind !== "calibration_merge" &&
                a.approval_kind !== "search_outcome_calibration" ? (
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
