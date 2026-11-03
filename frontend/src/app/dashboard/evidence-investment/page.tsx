"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Experiment = {
  id: number;
  status: string;
  selected_alternative_id?: string | null;
  alternatives?: { id: string; label?: string }[];
  requires_approval?: boolean;
  external_purchase?: boolean;
};

type Calibration = {
  id: number;
  status: string;
  version?: number;
  requires_approval?: boolean;
};

type Aggregate = {
  schema?: string;
  alembic?: string;
  questions?: { id: number; title: string; status: string }[];
  experiments?: Experiment[];
  allocation_calibrations?: Calibration[];
  health?: {
    questions?: number;
    experiments?: number;
    insight_cards?: { id: string; title: string; body: string }[];
    skill_mastery_inferred?: boolean;
  };
  safety?: Record<string, unknown>;
  routes?: Record<string, string>;
};

function EvidenceInvestmentInner() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const view = params.get("view") || "home";
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastDraftId, setLastDraftId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<Aggregate>(
        "/api/v1/candidates/me/evidence-investment",
        {},
        token
      );
      setAgg(data);
      setErr(null);
    } catch {
      setErr(t("evidenceInvestment.loadFailed"));
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
      setStatusMsg(t("evidenceInvestment.actionOk"));
      await load();
      return out;
    } catch {
      setErr(t("evidenceInvestment.actionFailed"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  const views = ["home", "experiments", "artifacts", "allocation"] as const;
  const safety = agg?.safety || {};

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("evidenceInvestment.eyebrow")} />
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <header>
          <p className="text-sm opacity-70">{t("evidenceInvestment.eyebrow")}</p>
          <h1 className="text-2xl font-semibold">{t("evidenceInvestment.title")}</h1>
          <p className="mt-2 text-sm opacity-80">{t("evidenceInvestment.lead")}</p>
        </header>
        {err ? <p role="alert">{err}</p> : null}
        {statusMsg ? <p role="status">{statusMsg}</p> : null}

        <nav aria-label={t("evidenceInvestment.views")} className="flex flex-wrap gap-3">
          {views.map((v) => (
            <Link key={v} className="twin-link" href={`/dashboard/evidence-investment?view=${v}`}>
              {t(
                `evidenceInvestment.view${v[0].toUpperCase()}${v.slice(1)}` as "evidenceInvestment.viewHome"
              )}
            </Link>
          ))}
        </nav>

        {(view === "home" || view === "experiments") && (
          <>
            <Card>
              <h2 className="text-lg font-medium">{t("evidenceInvestment.questionsTitle")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={busy}
                  onClick={() =>
                    void act("/api/v1/candidates/me/evidence-investment/questions", {
                      method: "POST",
                      body: JSON.stringify({ title: "Strengthen portfolio evidence" }),
                    })
                  }
                >
                  {t("evidenceInvestment.createQuestion")}
                </Button>
                <Button
                  disabled={busy}
                  onClick={() =>
                    void act("/api/v1/candidates/me/evidence-investment/gaps", {
                      method: "POST",
                      body: JSON.stringify({}),
                    })
                  }
                >
                  {t("evidenceInvestment.createGap")}
                </Button>
              </div>
              <ul className="mt-4 space-y-2">
                {(agg?.questions || []).map((q) => (
                  <li key={q.id} className="text-sm">
                    #{q.id} · {q.status} · {q.title}
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h2 className="text-lg font-medium">{t("evidenceInvestment.experimentsTitle")}</h2>
              <Button
                disabled={busy}
                onClick={() =>
                  void act("/api/v1/candidates/me/evidence-investment/experiments", {
                    method: "POST",
                    body: JSON.stringify({}),
                  })
                }
              >
                {t("evidenceInvestment.createExperiment")}
              </Button>
              <ul className="mt-4 space-y-3">
                {(agg?.experiments || []).map((e) => (
                  <li key={e.id} className="text-sm">
                    #{e.id} · {e.status}
                    <span className="ml-2 inline-flex flex-wrap gap-2">
                      {e.status === "draft" ? (
                        <>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void act(
                                `/api/v1/candidates/me/evidence-investment/experiments/${e.id}/simulate`,
                                { method: "POST", body: JSON.stringify({ effort_minutes: 90 }) }
                              )
                            }
                          >
                            {t("evidenceInvestment.simulate")}
                          </Button>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void act(
                                `/api/v1/candidates/me/evidence-investment/experiments/${e.id}/propose`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({
                                    selected_alternative_id:
                                      e.alternatives?.[0]?.id || "build_artifact",
                                  }),
                                }
                              )
                            }
                          >
                            {t("evidenceInvestment.propose")}
                          </Button>
                        </>
                      ) : null}
                      {e.status === "pending_approval" ? (
                        <>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void act(
                                `/api/v1/candidates/me/evidence-investment/experiments/${e.id}/resolve`,
                                { method: "POST", body: JSON.stringify({ action: "approve" }) }
                              )
                            }
                          >
                            {t("evidenceInvestment.approve")}
                          </Button>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void act(
                                `/api/v1/candidates/me/evidence-investment/experiments/${e.id}/resolve`,
                                { method: "POST", body: JSON.stringify({ action: "reject" }) }
                              )
                            }
                          >
                            {t("evidenceInvestment.reject")}
                          </Button>
                        </>
                      ) : null}
                      {e.status === "approved" || e.status === "active" ? (
                        <>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void act(
                                `/api/v1/candidates/me/evidence-investment/experiments/${e.id}/review`,
                                { method: "POST", body: JSON.stringify({ decision: "continue" }) }
                              )
                            }
                          >
                            {t("evidenceInvestment.reviewContinue")}
                          </Button>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void act(
                                `/api/v1/candidates/me/evidence-investment/experiments/${e.id}/review`,
                                { method: "POST", body: JSON.stringify({ decision: "pause" }) }
                              )
                            }
                          >
                            {t("evidenceInvestment.reviewPause")}
                          </Button>
                        </>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}

        {(view === "home" || view === "artifacts") && (
          <Card>
            <h2 className="text-lg font-medium">{t("evidenceInvestment.artifactsTitle")}</h2>
            <Button
              disabled={busy}
              onClick={async () => {
                const out = await act("/api/v1/candidates/me/evidence-investment/artifacts", {
                  method: "POST",
                  body: JSON.stringify({ title: "Internal evidence draft" }),
                });
                const id = (out as { id?: number } | null)?.id;
                if (typeof id === "number") setLastDraftId(id);
              }}
            >
              {t("evidenceInvestment.createArtifact")}
            </Button>
            {lastDraftId ? (
              <Button
                className="ml-2"
                disabled={busy}
                onClick={() =>
                  void act(
                    `/api/v1/candidates/me/evidence-investment/artifacts/${lastDraftId}/promote`,
                    { method: "POST" }
                  )
                }
              >
                {t("evidenceInvestment.promote")}
              </Button>
            ) : null}
          </Card>
        )}

        {(view === "home" || view === "allocation") && (
          <Card>
            <h2 className="text-lg font-medium">{t("evidenceInvestment.allocationTitle")}</h2>
            <Button
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/evidence-investment/allocation/calibrate", {
                  method: "POST",
                })
              }
            >
              {t("evidenceInvestment.proposeCalibration")}
            </Button>
            <ul className="mt-4 space-y-2">
              {(agg?.allocation_calibrations || []).map((c) => (
                <li key={c.id} className="text-sm">
                  #{c.id} · {c.status} · v{c.version}
                  {c.status === "pending" ? (
                    <span className="ml-2 inline-flex gap-2">
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void act(
                            `/api/v1/candidates/me/evidence-investment/allocation/calibrations/${c.id}/resolve`,
                            { method: "POST", body: JSON.stringify({ action: "approve" }) }
                          )
                        }
                      >
                        {t("evidenceInvestment.approve")}
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void act(
                            `/api/v1/candidates/me/evidence-investment/allocation/calibrations/${c.id}/resolve`,
                            { method: "POST", body: JSON.stringify({ action: "reject" }) }
                          )
                        }
                      >
                        {t("evidenceInvestment.reject")}
                      </Button>
                    </span>
                  ) : null}
                  {c.status === "approved" ? (
                    <Button
                      className="ml-2"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          `/api/v1/candidates/me/evidence-investment/allocation/calibrations/${c.id}/revert`,
                          { method: "POST" }
                        )
                      }
                    >
                      {t("evidenceInvestment.revert")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <h3 className="text-base font-medium">{t("evidenceInvestment.policyTitle")}</h3>
              <Button
                disabled={busy}
                onClick={async () => {
                  const out = await act("/api/v1/candidates/me/evidence-investment/policies", {
                    method: "POST",
                    body: JSON.stringify({ body: { weekly_learning_minutes: 120 } }),
                  });
                  const policy = (out as { policy?: { id?: number } } | null)?.policy;
                  if (policy?.id) {
                    await act(
                      `/api/v1/candidates/me/evidence-investment/policies/${policy.id}/simulate`,
                      { method: "POST" }
                    );
                  }
                }}
              >
                {t("evidenceInvestment.simulatePolicy")}
              </Button>
            </div>
            <ul className="mt-3 space-y-2">
              {(agg?.health?.insight_cards || []).map((c) => (
                <li key={c.id} className="text-sm">
                  <strong>{c.title}</strong> — {c.body}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <h2 className="text-lg font-medium">{t("evidenceInvestment.safetyTitle")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(safety).map(([k, v]) => (
              <li key={k}>
                {k}: {String(v)}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link className="twin-link" href="/dashboard/portfolio">
              {t("evidenceInvestment.portfolioLink")}
            </Link>
            <Link className="twin-link" href="/dashboard/execution-intelligence">
              {t("evidenceInvestment.execIntelLink")}
            </Link>
            <Link className="twin-link" href="/dashboard/approvals">
              {t("evidenceInvestment.approvalsLink")}
            </Link>
          </div>
          <p className="mt-2 text-xs opacity-70">{t("evidenceInvestment.disclaimer")}</p>
        </Card>
      </div>
    </Shell>
  );
}

export default function EvidenceInvestmentPage() {
  return (
    <Suspense fallback={null}>
      <EvidenceInvestmentInner />
    </Suspense>
  );
}
