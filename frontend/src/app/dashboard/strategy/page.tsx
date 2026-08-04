"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type RankingCand = {
  id?: string;
  title?: string;
  score?: number;
  rank?: number;
  deep_link?: string;
  module?: string;
};

type Proposal = {
  id: number;
  status: string;
  bundled?: boolean;
  explain?: { silent?: boolean; requires_approval?: boolean };
  before_weights?: Record<string, number>;
  after_weights?: Record<string, number>;
};

type Plan = {
  id: number;
  title?: string;
  status?: string;
  external_actions?: boolean;
  steps?: { id: number; action_type: string; status: string; external?: boolean }[];
};

type Aggregate = {
  schema?: string;
  alembic?: string;
  strategy?: { objectives?: string[]; version?: number };
  ranking?: {
    id?: number;
    candidates?: RankingCand[];
    explain?: Record<string, unknown>;
    counterfactuals?: { id: string; text: string }[];
    attribution?: Record<string, unknown>;
    weights_version?: number;
  };
  calibration_proposals?: Proposal[];
  plans?: Plan[];
  safety?: Record<string, unknown>;
};

export default function CareerStrategyPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<Aggregate>("/api/v1/candidates/me/career-strategy", {}, token);
      setAgg(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerStrategy.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function act(path: string, body: Record<string, unknown> = {}) {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setStatus("");
    try {
      await apiFetch(path, { method: "POST", body: JSON.stringify(body) }, token);
      setStatus(t("careerStrategy.actionOk"));
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerStrategy.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  const top = agg?.ranking?.candidates?.[0];
  const pending = (agg?.calibration_proposals || []).find((p) => p.status === "pending");

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("careerStrategy.eyebrow")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-[var(--twin-muted)]">
            {t("careerStrategy.eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold">{t("careerStrategy.title")}</h1>
          <p className="text-sm text-[var(--twin-muted)]">{t("careerStrategy.lead")}</p>
        </header>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {status ? (
          <p className="text-sm text-[var(--twin-muted)]" role="status">
            {status}
          </p>
        ) : null}

        <Card className="flex flex-col gap-3" data-strategy-ranking>
          <h2 className="text-lg font-semibold">{t("careerStrategy.rankingTitle")}</h2>
          <p className="text-sm">
            {t("careerStrategy.topAction")}:{" "}
            {top ? (
              <Link className="twin-link" href={top.deep_link || "/dashboard"}>
                {top.title}
              </Link>
            ) : (
              "—"
            )}
          </p>
          <p className="text-xs text-[var(--twin-muted)]">
            {t("careerStrategy.weightsVersion")}: {agg?.ranking?.weights_version ?? "—"} ·{" "}
            {t("careerStrategy.counterfactuals")}: {(agg?.ranking?.counterfactuals || []).length}
          </p>
          <ul className="list-inside list-decimal text-sm">
            {(agg?.ranking?.candidates || []).slice(0, 5).map((c) => (
              <li key={c.id || `${c.module}-${c.rank}`}>
                {c.title} ({c.score})
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => void act("/api/v1/candidates/me/career-strategy/ranking/refresh")}
            >
              {t("careerStrategy.refreshRanking")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/career-strategy/feedback", {
                  feedback: "helpful",
                  ranking_snapshot_id: agg?.ranking?.id,
                })
              }
            >
              {t("careerStrategy.feedbackHelpful")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void act("/api/v1/candidates/me/career-strategy/simulate")}
            >
              {t("careerStrategy.simulate")}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-3" data-strategy-calibration>
          <h2 className="text-lg font-semibold">{t("careerStrategy.calibrationTitle")}</h2>
          <p className="text-sm text-[var(--twin-muted)]">{t("careerStrategy.calibrationLead")}</p>
          {pending ? (
            <div className="text-sm">
              <p>
                {t("careerStrategy.pendingProposal")} #{pending.id} · bundled=
                {String(!!pending.bundled)}
              </p>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">
                {JSON.stringify(
                  { before: pending.before_weights, after: pending.after_weights },
                  null,
                  2,
                )}
              </pre>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void act(
                      `/api/v1/candidates/me/career-strategy/calibration/${pending.id}/resolve`,
                      { approved: true },
                    )
                  }
                >
                  {t("careerStrategy.approveCalibration")}
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void act(
                      `/api/v1/candidates/me/career-strategy/calibration/${pending.id}/resolve`,
                      { approved: false },
                    )
                  }
                >
                  {t("careerStrategy.rejectCalibration")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              disabled={busy}
              onClick={() => void act("/api/v1/candidates/me/career-strategy/calibration/propose")}
            >
              {t("careerStrategy.proposeCalibration")}
            </Button>
          )}
        </Card>

        <Card className="flex flex-col gap-3" data-strategy-plans>
          <h2 className="text-lg font-semibold">{t("careerStrategy.plansTitle")}</h2>
          <p className="text-sm text-[var(--twin-muted)]">{t("careerStrategy.plansLead")}</p>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void act("/api/v1/candidates/me/career-strategy/plans", {
                title: "Internal strategy plan",
                idempotency_key: `ui-${Date.now()}`,
              })
            }
          >
            {t("careerStrategy.createPlan")}
          </Button>
          <ul className="flex flex-col gap-3 text-sm">
            {(agg?.plans || []).map((p) => (
              <li key={p.id} className="border-b border-[var(--twin-border)] py-2">
                <p>
                  #{p.id} {p.title} · {p.status} · external={String(!!p.external_actions)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(`/api/v1/candidates/me/career-strategy/plans/${p.id}/run`)
                    }
                  >
                    {t("careerStrategy.runPlan")}
                  </Button>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(`/api/v1/candidates/me/career-strategy/plans/${p.id}/control`, {
                        action: "pause",
                      })
                    }
                  >
                    {t("careerStrategy.pausePlan")}
                  </Button>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(`/api/v1/candidates/me/career-strategy/plans/${p.id}/control`, {
                        action: "resume",
                      })
                    }
                  >
                    {t("careerStrategy.resumePlan")}
                  </Button>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(`/api/v1/candidates/me/career-strategy/plans/${p.id}/control`, {
                        action: "cancel",
                      })
                    }
                  >
                    {t("careerStrategy.cancelPlan")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col gap-3" data-strategy-deletion>
          <h2 className="text-lg font-semibold">{t("careerStrategy.deletionTitle")}</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/career-strategy/deletion/run", {
                  preview_only: true,
                })
              }
            >
              {t("careerStrategy.deletionPreview")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/career-strategy/deletion/run", {
                  preview_only: false,
                })
              }
            >
              {t("careerStrategy.deletionExecute")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void act("/api/v1/candidates/me/career-strategy/privacy/revoke")}
            >
              {t("careerStrategy.privacyRevoke")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void act("/api/v1/candidates/me/career-strategy/invalidate-stale")}
            >
              {t("careerStrategy.invalidateStale")}
            </Button>
          </div>
        </Card>

        <p className="text-xs text-[var(--twin-muted)]">{t("careerStrategy.disclaimer")}</p>
      </main>
    </Shell>
  );
}
