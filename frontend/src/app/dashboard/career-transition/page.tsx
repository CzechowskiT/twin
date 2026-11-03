"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Transition = {
  id: number;
  title: string;
  status?: string;
  plan_90_status?: string;
  snapshots_immutable?: boolean;
  workplace_monitoring?: boolean;
  external_resignation?: boolean;
  graph_update?: { candidate_approved?: boolean; applied?: boolean };
  resignation?: { external_send?: boolean };
};

type Aggregate = {
  transitions?: Transition[];
  outcomes?: { id: number; outcome_type: string }[];
  safety?: Record<string, unknown>;
  alembic?: string;
  privacy?: { learning_opt_in?: boolean; paused?: boolean };
};

export default function CareerTransitionPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [active, setActive] = useState<Transition | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setErr(null);
    try {
      const data = await apiFetch<Aggregate>("/api/v1/candidates/me/career-transition", {}, token);
      setAgg(data);
      if (data.transitions?.length) setActive(data.transitions[0]);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerTransition.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function runChain() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setStatus("");
    try {
      const offer = await apiFetch<{ offer: { id: number } }>(
        "/api/v1/candidates/me/interview-decision/offers",
        {
          method: "POST",
          body: JSON.stringify({
            title: "Synthetic accepted role",
            company: "SynthCo",
            terms: { base: "UNKNOWN" },
            provenance: "candidate_declared",
          }),
        },
        token,
      );
      const memo = await apiFetch<{ memo: { id: number } }>(
        "/api/v1/candidates/me/interview-decision/memos",
        {
          method: "POST",
          body: JSON.stringify({ offer_id: offer.offer.id, criteria: [] }),
        },
        token,
      );
      await apiFetch(
        `/api/v1/candidates/me/interview-decision/memos/${memo.memo.id}/declare`,
        {
          method: "POST",
          body: JSON.stringify({ decision: "accept_intent", notes: "Synthetic accept intent" }),
        },
        token,
      );
      const created = await apiFetch<{ transition: Transition }>(
        "/api/v1/candidates/me/career-transition/workspaces",
        {
          method: "POST",
          body: JSON.stringify({
            decision_id: memo.memo.id,
            title: "Synthetic first 90 days",
          }),
        },
        token,
      );
      const tid = created.transition.id;
      await apiFetch(
        `/api/v1/candidates/me/career-transition/workspaces/${tid}/plan-90/approve`,
        { method: "POST", body: JSON.stringify({ approved: true }) },
        token,
      );
      await apiFetch(
        `/api/v1/candidates/me/career-transition/workspaces/${tid}/checkins`,
        {
          method: "POST",
          body: JSON.stringify({
            period: "week_1",
            facts: { meetings: 2 },
            interpretation: { feeling: "on track" },
          }),
        },
        token,
      );
      await apiFetch(
        `/api/v1/candidates/me/career-transition/workspaces/${tid}/graph/approve`,
        { method: "POST", body: JSON.stringify({ approved: true }) },
        token,
      );
      setStatus(t("careerTransition.chainDone"));
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerTransition.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("careerTransition.eyebrow")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-[var(--twin-muted)]">
            {t("careerTransition.eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{t("careerTransition.title")}</h1>
          <p className="text-base text-[var(--twin-muted)]">{t("careerTransition.lead")}</p>
          <p
            className="rounded-md border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-2 text-sm"
            role="status"
          >
            {t("careerTransition.safetyBanner")}
          </p>
        </header>

        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {status ? (
          <p className="text-sm text-emerald-800" role="status">
            {status}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void runChain()} disabled={busy}>
            {busy ? "…" : t("careerTransition.runChain")}
          </Button>
          <Button type="button" onClick={() => void load()} disabled={busy}>
            {t("careerTransition.refresh")}
          </Button>
        </div>

        <Card>
          <h2 className="text-lg font-medium">{t("careerTransition.workspaces")}</h2>
          {!agg?.transitions?.length ? (
            <p className="mt-2 text-sm text-[var(--twin-muted)]">{t("careerTransition.empty")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {agg.transitions.map((tr) => (
                <li key={tr.id}>
                  <button
                    type="button"
                    className="w-full rounded-md border border-[var(--twin-border)] px-3 py-2 text-left text-sm hover:bg-[var(--twin-surface)]"
                    onClick={() => setActive(tr)}
                  >
                    {tr.title} — {tr.plan_90_status || "AI_DRAFT"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {active ? (
          <Card id="outcomes">
            <h2 className="text-lg font-medium">{t("careerTransition.active")}</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <div>
                <dt className="text-[var(--twin-muted)]">{t("careerTransition.planStatus")}</dt>
                <dd>{active.plan_90_status}</dd>
              </div>
              <div>
                <dt className="text-[var(--twin-muted)]">{t("careerTransition.snapshots")}</dt>
                <dd>{active.snapshots_immutable ? "immutable" : "mutable"}</dd>
              </div>
              <div>
                <dt className="text-[var(--twin-muted)]">{t("careerTransition.monitoring")}</dt>
                <dd>{active.workplace_monitoring ? "ON" : "OFF"}</dd>
              </div>
              <div>
                <dt className="text-[var(--twin-muted)]">{t("careerTransition.resignation")}</dt>
                <dd>
                  {active.resignation?.external_send || active.external_resignation
                    ? "external"
                    : "draft-only"}
                </dd>
              </div>
            </dl>
          </Card>
        ) : null}

        <Card>
          <h2 className="text-lg font-medium">{t("careerTransition.outcomes")}</h2>
          <ul className="mt-2 list-inside list-disc text-sm">
            {(agg?.outcomes || []).slice(0, 8).map((o) => (
              <li key={o.id}>{o.outcome_type}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--twin-muted)]">{t("careerTransition.disclaimer")}</p>
          {agg?.alembic ? (
            <p className="mt-1 text-xs text-[var(--twin-muted)]">Alembic: {agg.alembic}</p>
          ) : null}
        </Card>
      </main>
    </Shell>
  );
}
