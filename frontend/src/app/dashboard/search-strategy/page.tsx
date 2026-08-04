"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Strategy = {
  id: number;
  title?: string;
  status?: string;
  silent_activation?: boolean;
  role_theses?: { id: number; title: string; stale?: boolean }[];
  portfolios?: { id: number; title: string; balance?: { balanced?: boolean } }[];
  experiments?: { id: number; status: string; silent_weight_change?: boolean }[];
  cycles?: { id: number; status: string; spawns_tasks?: boolean }[];
  health?: { score?: number | null; fabricated_conversion?: boolean };
};

type Aggregate = {
  strategies?: Strategy[];
  coverage?: { wording?: string; whole_market_claim?: boolean; metrics?: Record<string, unknown> };
  alembic?: string;
  safety?: Record<string, unknown>;
};

export default function SearchStrategyPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("Platform search strategy");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<Aggregate>("/api/v1/candidates/me/search-strategy", {}, token);
      setAgg(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("searchStrategy.loadFailed"));
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
    try {
      await apiFetch(path, { method: "POST", body: JSON.stringify(body) }, token);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("searchStrategy.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  const active = (agg?.strategies || [])[0];

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("searchStrategy.eyebrow")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header>
          <p className="text-sm uppercase tracking-wide text-[var(--twin-muted)]">
            {t("searchStrategy.eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold">{t("searchStrategy.title")}</h1>
          <p className="text-sm text-[var(--twin-muted)]">{t("searchStrategy.lead")}</p>
        </header>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}

        <Card className="flex flex-col gap-3" data-market-radar>
          <h2 className="text-lg font-semibold">{t("searchStrategy.coverageTitle")}</h2>
          <p className="text-sm text-[var(--twin-muted)]">
            wording={agg?.coverage?.wording || "observed_source"} · whole_market=
            {String(!!agg?.coverage?.whole_market_claim)}
          </p>
          <Button
            type="button"
            disabled={busy || !active}
            onClick={() =>
              active && void act(`/api/v1/candidates/me/search-strategy/${active.id}/coverage`)
            }
          >
            {t("searchStrategy.refreshCoverage")}
          </Button>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("searchStrategy.labTitle")}</h2>
          <label className="text-xs" htmlFor="ss-title">
            {t("searchStrategy.strategyTitle")}
          </label>
          <input
            id="ss-title"
            className="min-h-[2.75rem] rounded border border-[var(--twin-border)] bg-transparent px-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button
            type="button"
            disabled={busy || !title}
            onClick={() =>
              void act("/api/v1/candidates/me/search-strategy", {
                title,
                target_role: "Platform Engineer",
              })
            }
          >
            {t("searchStrategy.createDraft")}
          </Button>
        </Card>

        {(agg?.strategies || []).map((s) => (
          <Card key={s.id} className="flex flex-col gap-3" data-search-strategy>
            <p className="text-sm font-medium">
              #{s.id} {s.title} · {s.status} · silent_activation=
              {String(!!s.silent_activation)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy || s.status === "active" || s.status === "pending_approval"}
                onClick={() =>
                  void act(`/api/v1/candidates/me/search-strategy/${s.id}/propose-activate`)
                }
              >
                {t("searchStrategy.proposeActivate")}
              </Button>
              <Button
                type="button"
                disabled={busy || s.status !== "pending_approval"}
                onClick={() =>
                  void act(`/api/v1/candidates/me/search-strategy/${s.id}/resolve-activate`, {
                    approved: true,
                  })
                }
              >
                {t("searchStrategy.approveActivate")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(`/api/v1/candidates/me/search-strategy/${s.id}/thesis`, {
                    title: "Role thesis",
                    body: { focus: "platform" },
                  })
                }
              >
                {t("searchStrategy.addThesis")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(`/api/v1/candidates/me/search-strategy/${s.id}/portfolio/refresh`)
                }
              >
                {t("searchStrategy.refreshPortfolio")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(`/api/v1/candidates/me/search-strategy/${s.id}/experiments`, {
                    hypothesis: "More stretch roles improve interview rate",
                  })
                }
              >
                {t("searchStrategy.createExperiment")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void act(`/api/v1/candidates/me/search-strategy/${s.id}/simulate`)}
              >
                {t("searchStrategy.simulate")}
              </Button>
            </div>
            <ul className="text-xs text-[var(--twin-muted)]">
              {(s.experiments || []).map((e) => (
                <li key={e.id}>
                  experiment #{e.id} {e.status} silent_weight={String(!!e.silent_weight_change)}{" "}
                  <Button
                    type="button"
                    disabled={busy || e.status === "completed"}
                    onClick={() =>
                      void act(
                        `/api/v1/candidates/me/search-strategy/experiments/${e.id}/complete`,
                        { observation: "No silent weight change" },
                      )
                    }
                  >
                    {t("searchStrategy.completeExperiment")}
                  </Button>
                </li>
              ))}
              {(s.cycles || []).map((c) => (
                <li key={c.id}>
                  cycle #{c.id} {c.status} spawns={String(!!c.spawns_tasks)}{" "}
                  {c.status === "active" ? (
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void act(`/api/v1/candidates/me/search-strategy/cycles/${c.id}/archive`)
                      }
                    >
                      {t("searchStrategy.archiveCycle")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ))}

        <p className="text-sm">
          <Link className="twin-link" href="/dashboard/approvals">
            {t("careerLifecycle.approvals")}
          </Link>
          {" · "}
          <Link className="twin-link" href="/dashboard/jobs">
            {t("opportunityIntel.eyebrow")}
          </Link>
          {" · "}
          <Link className="twin-link" href="/dashboard/strategy">
            {t("careerStrategy.eyebrow")}
          </Link>
        </p>
        <p className="text-xs text-[var(--twin-muted)]">{t("searchStrategy.disclaimer")}</p>
      </main>
    </Shell>
  );
}
