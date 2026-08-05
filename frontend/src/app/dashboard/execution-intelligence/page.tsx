"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Calibration = {
  id: number;
  status: string;
  version?: number;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  silent?: boolean;
  requires_approval?: boolean;
};

type Aggregate = {
  schema?: string;
  alembic?: string;
  estimation_profile?: { version?: number; factors?: Record<string, unknown>; sample_count?: number };
  estimate_calibrations?: Calibration[];
  capacity_calibrations?: Calibration[];
  health?: {
    comparison_count?: number;
    insight_cards?: { id: string; title: string; body: string; claim_kind?: string }[];
    productivity_score?: null;
  };
  postponements?: { postponed_batch_count?: number; guilt?: boolean; streak?: boolean };
  safety?: Record<string, unknown>;
  routes?: Record<string, string>;
};

function ExecutionIntelligenceInner() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const view = params.get("view") || "home";
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<Aggregate>(
        "/api/v1/candidates/me/execution-intelligence",
        {},
        token
      );
      setAgg(data);
      setErr(null);
    } catch {
      setErr(t("executionIntelligence.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(path: string, init?: RequestInit) {
    const token = getToken();
    if (!token) return null;
    setBusy(true);
    try {
      const out = await apiFetch<Record<string, unknown>>(path, init || {}, token);
      setStatusMsg(t("executionIntelligence.actionOk"));
      await load();
      return out;
    } catch {
      setErr(t("executionIntelligence.actionFailed"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  const views = ["home", "estimates", "quality", "capacity", "policy"] as const;
  const safety = agg?.safety || {};

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("executionIntelligence.eyebrow")} />
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <header>
          <p className="text-sm opacity-70">{t("executionIntelligence.eyebrow")}</p>
          <h1 className="text-2xl font-semibold">{t("executionIntelligence.title")}</h1>
          <p className="mt-2 text-sm opacity-80">{t("executionIntelligence.lead")}</p>
        </header>
        {err ? <p role="alert">{err}</p> : null}
        {statusMsg ? <p role="status">{statusMsg}</p> : null}

        <nav aria-label={t("executionIntelligence.views")} className="flex flex-wrap gap-3">
          {views.map((v) => (
            <Link
              key={v}
              className="twin-link"
              href={`/dashboard/execution-intelligence?view=${v}`}
            >
              {t(`executionIntelligence.view${v[0].toUpperCase()}${v.slice(1)}` as "executionIntelligence.viewHome")}
            </Link>
          ))}
        </nav>

        {(view === "home" || view === "estimates") && (
          <Card>
            <h2 className="text-lg font-medium">{t("executionIntelligence.estimatesTitle")}</h2>
            <p className="text-sm opacity-80">
              {t("executionIntelligence.profileVersion")}: {agg?.estimation_profile?.version ?? "—"} ·{" "}
              {t("executionIntelligence.samples")}: {agg?.estimation_profile?.sample_count ?? 0}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={() => void act("/api/v1/candidates/me/execution-intelligence/estimates/calibrate", { method: "POST" })}
              >
                {t("executionIntelligence.proposeEstimateCal")}
              </Button>
            </div>
            <ul className="mt-4 space-y-2">
              {(agg?.estimate_calibrations || []).map((c) => (
                <li key={c.id} className="text-sm">
                  #{c.id} · {c.status} · v{c.version}
                  {c.status === "pending" ? (
                    <span className="ml-2 inline-flex gap-2">
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void act(
                            `/api/v1/candidates/me/execution-intelligence/estimates/calibrations/${c.id}/resolve`,
                            { method: "POST", body: JSON.stringify({ action: "approve" }) }
                          )
                        }
                      >
                        {t("executionIntelligence.approve")}
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void act(
                            `/api/v1/candidates/me/execution-intelligence/estimates/calibrations/${c.id}/resolve`,
                            { method: "POST", body: JSON.stringify({ action: "reject" }) }
                          )
                        }
                      >
                        {t("executionIntelligence.reject")}
                      </Button>
                    </span>
                  ) : null}
                  {c.status === "approved" ? (
                    <Button
                      className="ml-2"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          `/api/v1/candidates/me/execution-intelligence/estimates/calibrations/${c.id}/revert`,
                          { method: "POST" }
                        )
                      }
                    >
                      {t("executionIntelligence.revert")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(view === "home" || view === "quality") && (
          <Card>
            <h2 className="text-lg font-medium">{t("executionIntelligence.qualityTitle")}</h2>
            <Button
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/execution-intelligence/quality/analyze", {
                  method: "POST",
                  body: JSON.stringify({}),
                })
              }
            >
              {t("executionIntelligence.runQuality")}
            </Button>
            <p className="mt-2 text-sm">
              {t("executionIntelligence.postponed")}: {agg?.postponements?.postponed_batch_count ?? 0}
            </p>
            <ul className="mt-3 space-y-2">
              {(agg?.health?.insight_cards || []).map((c) => (
                <li key={c.id} className="text-sm">
                  <strong>{c.title}</strong> — {c.body}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(view === "home" || view === "capacity") && (
          <Card>
            <h2 className="text-lg font-medium">{t("executionIntelligence.capacityTitle")}</h2>
            <Button
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/execution-intelligence/capacity/calibrate", {
                  method: "POST",
                })
              }
            >
              {t("executionIntelligence.proposeCapacityCal")}
            </Button>
            <ul className="mt-4 space-y-2">
              {(agg?.capacity_calibrations || []).map((c) => (
                <li key={c.id} className="text-sm">
                  #{c.id} · {c.status}
                  {c.status === "pending" ? (
                    <span className="ml-2 inline-flex gap-2">
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void act(
                            `/api/v1/candidates/me/execution-intelligence/capacity/calibrations/${c.id}/resolve`,
                            { method: "POST", body: JSON.stringify({ action: "approve" }) }
                          )
                        }
                      >
                        {t("executionIntelligence.approve")}
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void act(
                            `/api/v1/candidates/me/execution-intelligence/capacity/calibrations/${c.id}/resolve`,
                            { method: "POST", body: JSON.stringify({ action: "reject" }) }
                          )
                        }
                      >
                        {t("executionIntelligence.reject")}
                      </Button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(view === "home" || view === "policy") && (
          <Card>
            <h2 className="text-lg font-medium">{t("executionIntelligence.policyTitle")}</h2>
            <Button
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/execution-intelligence/policies", {
                  method: "POST",
                  body: JSON.stringify({ body: { max_holds_per_week: 5 } }),
                }).then(async (out) => {
                  const id = (out?.policy as { id?: number } | undefined)?.id;
                  if (id) {
                    await act(`/api/v1/candidates/me/execution-intelligence/policies/${id}/simulate`, {
                      method: "POST",
                    });
                  }
                })
              }
            >
              {t("executionIntelligence.simulatePolicy")}
            </Button>
          </Card>
        )}

        <Card>
          <h2 className="text-lg font-medium">{t("executionIntelligence.safetyTitle")}</h2>
          <ul className="text-sm opacity-80">
            <li>productivity_score: {String(safety.productivity_score ?? false)}</li>
            <li>silent_estimate_change: {String(safety.silent_estimate_change ?? false)}</li>
            <li>silent_capacity_change: {String(safety.silent_capacity_change ?? false)}</li>
            <li>historic_batches_rewritten: {String(safety.historic_batches_rewritten ?? false)}</li>
            <li>phase_3: {String(safety.phase_3_career_agent)}</li>
          </ul>
          <p className="mt-3 text-sm">
            <Link className="twin-link" href="/dashboard/execution-calendar">
              {t("executionIntelligence.execCalLink")}
            </Link>
            {" · "}
            <Link className="twin-link" href="/dashboard/approvals">
              {t("executionIntelligence.approvalsLink")}
            </Link>
          </p>
          <p className="mt-2 text-xs opacity-70">{t("executionIntelligence.disclaimer")}</p>
        </Card>
      </div>
    </Shell>
  );
}

export default function ExecutionIntelligencePage() {
  return (
    <Suspense fallback={null}>
      <ExecutionIntelligenceInner />
    </Suspense>
  );
}
