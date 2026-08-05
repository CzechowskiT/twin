"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Review = {
  id: number;
  title?: string;
  cadence: string;
  status: string;
  immutable?: boolean;
  spawns_tasks?: boolean;
  snapshot_hash?: string | null;
  observations?: { id: number; source_module: string; lineage?: { lineage_present?: boolean } }[];
  silent_strategy_change?: boolean;
};

type Cluster = {
  cluster_key?: string;
  label?: string;
  status?: string;
  opportunity_count?: number;
  demand_claim?: boolean;
  fabricated_progress?: boolean;
};

type Aggregate = {
  reviews?: Review[];
  clusters?: { clusters?: Cluster[]; status?: string; demand_claim?: boolean; fabricated_progress?: boolean };
  assumptions?: { id: number; statement: string; status: string }[];
  routes?: Record<string, string>;
  safety?: Record<string, unknown>;
  alembic?: string;
  residual_epic_23?: Record<string, boolean>;
};

function ReviewCenterPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const cadenceHint = params.get("cadence") || "weekly";
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assumptionText, setAssumptionText] = useState("");
  const [compareLeft, setCompareLeft] = useState<number | null>(null);
  const [compareRight, setCompareRight] = useState<number | null>(null);
  const [compareOut, setCompareOut] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<Aggregate>("/api/v1/candidates/me/strategy-reviews", {}, token);
      setAgg(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("reviewCenter.loadFailed"));
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
      await load();
      return out;
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("reviewCenter.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  const reviews = agg?.reviews || [];
  const clusters = agg?.clusters?.clusters || [];

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("reviewCenter.eyebrow")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header>
          <p className="text-sm uppercase tracking-wide text-[var(--twin-muted)]">
            {t("reviewCenter.eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold">{t("reviewCenter.title")}</h1>
          <p className="text-sm text-[var(--twin-muted)]">{t("reviewCenter.lead")}</p>
        </header>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}

        <Card className="flex flex-col gap-3" data-review-center>
          <h2 className="text-lg font-semibold">{t("reviewCenter.sessionsTitle")}</h2>
          <p className="text-sm text-[var(--twin-muted)]">
            {t("reviewCenter.sessionsHint")} · alembic={agg?.alembic || "—"} · silent=
            {String(!!agg?.safety?.silent_strategy_change)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/strategy-reviews/sessions", {
                  cadence: cadenceHint === "monthly" ? "monthly" : "weekly",
                })
              }
            >
              {t("reviewCenter.createWeekly")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/strategy-reviews/sessions", { cadence: "monthly" })
              }
            >
              {t("reviewCenter.createMonthly")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void act("/api/v1/candidates/me/strategy-reviews/clusters/refresh")}
            >
              {t("reviewCenter.refreshClusters")}
            </Button>
          </div>
          <ul className="flex flex-col gap-3 text-sm">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 border-b border-[var(--twin-border)] py-3"
                data-review-id={r.id}
              >
                <span>
                  #{r.id} · {r.cadence} · {r.status} · immutable={String(!!r.immutable)} · spawn=
                  {String(!!r.spawns_tasks)} · lineage=
                  {String(
                    (r.observations || []).every((o) => o.lineage?.lineage_present !== false),
                  )}
                </span>
                <span className="text-xs text-[var(--twin-muted)]">
                  hash={r.snapshot_hash || "—"} · silent_change=
                  {String(!!r.silent_strategy_change)}
                </span>
                <span className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busy || r.immutable}
                    onClick={() =>
                      void act(`/api/v1/candidates/me/strategy-reviews/sessions/${r.id}/finalize`)
                    }
                  >
                    {t("reviewCenter.finalize")}
                  </Button>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(`/api/v1/candidates/me/strategy-reviews/sessions/${r.id}/archive`)
                    }
                  >
                    {t("reviewCenter.archive")}
                  </Button>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setCompareLeft((prev) => prev ?? r.id);
                      setCompareRight(r.id);
                    }}
                  >
                    {t("reviewCenter.markCompare")}
                  </Button>
                  <Link
                    className="twin-link inline-flex min-h-[2.75rem] items-center"
                    href={`/dashboard/decision-journal?review_id=${r.id}`}
                  >
                    {t("reviewCenter.openDecision")}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || !compareLeft || !compareRight}
              onClick={async () => {
                const out = await act("/api/v1/candidates/me/strategy-reviews/compare", {
                  left_id: compareLeft,
                  right_id: compareRight,
                });
                if (out) setCompareOut(out);
              }}
            >
              {t("reviewCenter.compare")}
            </Button>
            {compareOut ? (
              <span className="text-xs text-[var(--twin-muted)]">
                equal={String(!!compareOut.hashes_equal)} · claim={String(compareOut.claim_kind)}
              </span>
            ) : null}
          </div>
        </Card>

        <Card className="flex flex-col gap-3" data-cluster-outcomes>
          <h2 className="text-lg font-semibold">{t("reviewCenter.clustersTitle")}</h2>
          <p className="text-sm text-[var(--twin-muted)]">
            status={agg?.clusters?.status || "INSUFFICIENT_DATA"} · demand=
            {String(!!agg?.clusters?.demand_claim)} · fabricated=
            {String(!!agg?.clusters?.fabricated_progress)}
          </p>
          <ul className="text-sm">
            {clusters.length === 0 ? (
              <li>{t("reviewCenter.clustersEmpty")}</li>
            ) : (
              clusters.map((c) => (
                <li key={c.cluster_key || c.label} className="border-b border-[var(--twin-border)] py-2">
                  {c.label || c.cluster_key} · n={c.opportunity_count ?? 0} · {c.status} · demand=
                  {String(!!c.demand_claim)} · fabricated={String(!!c.fabricated_progress)}
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("reviewCenter.assumptionsTitle")}</h2>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("reviewCenter.assumptionLabel")}</span>
            <input
              className="rounded border border-[var(--twin-border)] bg-transparent px-3 py-2"
              value={assumptionText}
              onChange={(e) => setAssumptionText(e.target.value)}
              maxLength={500}
            />
          </label>
          <Button
            type="button"
            disabled={busy || !assumptionText.trim()}
            onClick={() =>
              void act("/api/v1/candidates/me/strategy-reviews/assumptions", {
                statement: assumptionText.trim(),
              }).then(() => setAssumptionText(""))
            }
          >
            {t("reviewCenter.addAssumption")}
          </Button>
          <ul className="text-sm">
            {(agg?.assumptions || []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 border-b border-[var(--twin-border)] py-2">
                <span>
                  #{a.id} · {a.status} · {a.statement}
                </span>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void act(`/api/v1/candidates/me/strategy-reviews/assumptions/${a.id}/evaluate`, {
                      result: "inconclusive",
                    })
                  }
                >
                  {t("reviewCenter.evaluateAssumption")}
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        <p className="text-xs text-[var(--twin-muted)]">
          <Link className="twin-link" href="/dashboard/decision-journal">
            {t("decisionJournal.eyebrow")}
          </Link>
          {" · "}
          <Link className="twin-link" href="/dashboard/search-outcomes">
            {t("searchOutcomes.eyebrow")}
          </Link>
          {" · "}
          <Link className="twin-link" href="/dashboard/career">
            {t("reviewCenter.dailyOsLink")}
          </Link>
          {" · "}
          {t("reviewCenter.disclaimer")}
        </p>
      </main>
    </Shell>
  );
}


export default function ReviewCenterPage() {
  return (
    <Suspense fallback={null}>
      <ReviewCenterPageContent />
    </Suspense>
  );
}
