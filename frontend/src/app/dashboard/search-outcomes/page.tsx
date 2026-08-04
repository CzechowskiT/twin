"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Aggregate = {
  funnel?: {
    counts?: Record<string, number>;
    ratios?: Record<string, unknown>;
    denominators?: { disclosed?: boolean; hidden_denominators?: boolean };
    unknowns?: unknown[];
    benchmark?: { fabricated?: boolean; status?: string };
    wording?: string;
  };
  calibrations?: {
    id: number;
    status: string;
    silent?: boolean;
    before_weights?: Record<string, number>;
    after_weights?: Record<string, number>;
  }[];
  routes?: { daily_os_canonical?: string; daily_os_fe?: string };
  safety?: Record<string, unknown>;
  alembic?: string;
  components?: {
    saved_searches?: { quality?: string; static_refs_only?: boolean }[];
    watchlists?: { quality?: string; static_refs_only?: boolean }[];
    experiments?: { silent_weight_change?: boolean }[];
    cycles?: { status?: string; spawns_tasks?: boolean }[];
  };
};

export default function SearchOutcomesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkageId, setLinkageId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<Aggregate>("/api/v1/candidates/me/search-outcomes", {}, token);
      setAgg(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("searchOutcomes.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function act(path: string, body: Record<string, unknown> = {}, method = "POST") {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const out = await apiFetch<Record<string, unknown>>(
        path,
        { method, body: method === "GET" ? undefined : JSON.stringify(body) },
        token,
      );
      if (out?.linkage && typeof out.linkage === "object" && "id" in (out.linkage as object)) {
        setLinkageId(Number((out.linkage as { id: number }).id));
      }
      await load();
      return out;
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("searchOutcomes.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  const funnel = agg?.funnel;

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("searchOutcomes.eyebrow")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header>
          <p className="text-sm uppercase tracking-wide text-[var(--twin-muted)]">
            {t("searchOutcomes.eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold">{t("searchOutcomes.title")}</h1>
          <p className="text-sm text-[var(--twin-muted)]">{t("searchOutcomes.lead")}</p>
        </header>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}

        <Card className="flex flex-col gap-3" data-search-funnel>
          <h2 className="text-lg font-semibold">{t("searchOutcomes.funnelTitle")}</h2>
          <p className="text-sm text-[var(--twin-muted)]">
            wording={funnel?.wording || "candidate_specific"} · benchmark=
            {funnel?.benchmark?.status || "NOT_PROVIDED"} · fabricated=
            {String(!!funnel?.benchmark?.fabricated)} · denominators_disclosed=
            {String(!!funnel?.denominators?.disclosed)} · hidden=
            {String(!!funnel?.denominators?.hidden_denominators)}
          </p>
          <pre className="overflow-auto whitespace-pre-wrap text-xs text-[var(--twin-muted)]">
            {JSON.stringify(
              { counts: funnel?.counts, ratios: funnel?.ratios, unknowns: funnel?.unknowns },
              null,
              2,
            )}
          </pre>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void act("/api/v1/candidates/me/search-outcomes/funnel/refresh")}
          >
            {t("searchOutcomes.refreshFunnel")}
          </Button>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("searchOutcomes.linkageTitle")}</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/search-outcomes/linkages", {
                  stage: "OPPORTUNITY_SEEN",
                  provenance: "CANDIDATE_DECLARED",
                })
              }
            >
              {t("searchOutcomes.addLinkage")}
            </Button>
            <Button
              type="button"
              disabled={busy || !linkageId}
              onClick={() =>
                void act("/api/v1/candidates/me/search-outcomes/events", {
                  linkage_id: linkageId,
                  to_stage: "APPLICATION_DECLARED",
                  provenance: "CANDIDATE_DECLARED",
                })
              }
            >
              {t("searchOutcomes.declareApplication")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/search-outcomes/feedback", {
                  kind: "usefulness",
                  body: { helpful: true },
                })
              }
            >
              {t("searchOutcomes.addFeedback")}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("searchOutcomes.calibrationTitle")}</h2>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void act("/api/v1/candidates/me/search-outcomes/calibrations", {
                rationale: "Observed candidate-specific funnel",
              })
            }
          >
            {t("searchOutcomes.proposeCalibration")}
          </Button>
          <ul className="text-sm">
            {(agg?.calibrations || []).map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-2 border-b border-[var(--twin-border)] py-2"
              >
                <span>
                  calibration #{c.id} · {c.status} · silent={String(!!c.silent)}
                </span>
                {c.status === "pending" ? (
                  <span className="flex gap-2">
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          `/api/v1/candidates/me/search-outcomes/calibrations/${c.id}/resolve`,
                          { approved: true },
                        )
                      }
                    >
                      {t("searchOutcomes.approveCalibration")}
                    </Button>
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          `/api/v1/candidates/me/search-outcomes/calibrations/${c.id}/resolve`,
                          { approved: false },
                        )
                      }
                    >
                      {t("searchOutcomes.rejectCalibration")}
                    </Button>
                  </span>
                ) : null}
                {c.status === "approved" ? (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        `/api/v1/candidates/me/search-outcomes/calibrations/${c.id}/revert`,
                      )
                    }
                  >
                    {t("searchOutcomes.revertCalibration")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>

        <p className="text-sm">
          <Link className="twin-link" href="/dashboard/search-strategy">
            {t("searchStrategy.eyebrow")}
          </Link>
          {" · "}
          <Link className="twin-link" href="/dashboard/career">
            {t("searchOutcomes.dailyOsLink")}
          </Link>
          {" · "}
          <Link className="twin-link" href="/dashboard/approvals">
            {t("careerLifecycle.approvals")}
          </Link>
        </p>
        <p className="text-xs text-[var(--twin-muted)]">
          {t("searchOutcomes.disclaimer")} · daily_os=
          {agg?.routes?.daily_os_canonical || "/api/v1/candidates/me/career-copilot/daily"}
        </p>
      </main>
    </Shell>
  );
}
