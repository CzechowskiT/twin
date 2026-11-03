"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Opp = {
  id: number;
  title?: string;
  company?: string;
  stale?: boolean;
  fit?: { score?: number | null; claim_kind?: string };
  salary?: { claim_kind?: string; fabricated?: boolean };
  activity_status?: string;
  readiness?: { stale_warning?: boolean; studio_handoff_safe?: boolean };
};

type Market = {
  wording?: string;
  fabricated?: boolean;
  metrics?: { total_observed_jobs?: number; demand_trend?: string };
};

type Aggregate = {
  opportunities?: Opp[];
  market?: Market;
  alembic?: string;
  safety?: Record<string, unknown>;
};

type OpportunityIntelligencePanelProps = {
  selectedJobId?: number | null;
};

export function OpportunityIntelligencePanel({ selectedJobId }: OpportunityIntelligencePanelProps) {
  const { t } = useTranslation();
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteCompany, setPasteCompany] = useState("");
  const [pasteDesc, setPasteDesc] = useState("");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<Aggregate>(
        "/api/v1/candidates/me/opportunity-intelligence",
        {},
        token,
      );
      setAgg(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("opportunityIntel.loadFailed"));
    }
  }, [t]);

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
      await apiFetch(path, { method, body: JSON.stringify(body) }, token);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("opportunityIntel.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4" data-opportunity-intelligence-panel>
      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--twin-muted)]">
          {t("opportunityIntel.eyebrow")}
        </p>
        <h2 className="text-lg font-semibold">{t("opportunityIntel.title")}</h2>
        <p className="text-sm text-[var(--twin-muted)]">{t("opportunityIntel.lead")}</p>
      </div>
      {err ? (
        <p className="text-sm text-red-700" role="alert">
          {err}
        </p>
      ) : null}
      <p className="text-xs text-[var(--twin-muted)]">
        {t("opportunityIntel.marketObserved")}: {agg?.market?.metrics?.total_observed_jobs ?? "—"} ·{" "}
        {t("opportunityIntel.demandTrend")}: {agg?.market?.metrics?.demand_trend ?? "UNKNOWN"} ·{" "}
        wording={agg?.market?.wording || "observed_source"}
      </p>
      <div className="flex flex-col gap-2">
        <label className="text-xs" htmlFor="oi-title">
          {t("opportunityIntel.pasteTitle")}
        </label>
        <input
          id="oi-title"
          className="min-h-[2.75rem] rounded border border-[var(--twin-border)] bg-transparent px-2 text-sm"
          value={pasteTitle}
          onChange={(e) => setPasteTitle(e.target.value)}
        />
        <label className="text-xs" htmlFor="oi-company">
          {t("opportunityIntel.pasteCompany")}
        </label>
        <input
          id="oi-company"
          className="min-h-[2.75rem] rounded border border-[var(--twin-border)] bg-transparent px-2 text-sm"
          value={pasteCompany}
          onChange={(e) => setPasteCompany(e.target.value)}
        />
        <label className="text-xs" htmlFor="oi-desc">
          {t("opportunityIntel.pasteDesc")}
        </label>
        <textarea
          id="oi-desc"
          className="min-h-[4.5rem] rounded border border-[var(--twin-border)] bg-transparent px-2 py-2 text-sm"
          value={pasteDesc}
          onChange={(e) => setPasteDesc(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy || !pasteTitle || !pasteCompany}
            onClick={() =>
              void act("/api/v1/candidates/me/opportunity-intelligence/ingest/paste", {
                title: pasteTitle,
                company: pasteCompany,
                description: pasteDesc,
              })
            }
          >
            {t("opportunityIntel.ingestPaste")}
          </Button>
          {selectedJobId ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/opportunity-intelligence/ingest/job", {
                  job_id: selectedJobId,
                })
              }
            >
              {t("opportunityIntel.ingestSelectedJob")}
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void act("/api/v1/candidates/me/opportunity-intelligence/refresh", {
                idempotency_key: `ui-${Date.now()}`,
              })
            }
          >
            {t("opportunityIntel.refresh")}
          </Button>
        </div>
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {(agg?.opportunities || []).slice(0, 5).map((o) => (
          <li key={o.id} className="border-b border-[var(--twin-border)] py-2">
            <p>
              {o.title} @ {o.company}
              {o.stale ? ` · ${t("opportunityIntel.stale")}` : ""}
            </p>
            <p className="text-xs text-[var(--twin-muted)]">
              fit={o.fit?.score ?? "UNKNOWN"} · salary={o.salary?.claim_kind ?? "UNKNOWN"} ·{" "}
              {o.activity_status}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(
                    `/api/v1/candidates/me/opportunity-intelligence/${o.id}/studio-handoff`,
                  )
                }
              >
                {t("opportunityIntel.studioHandoff")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(
                    `/api/v1/candidates/me/opportunity-intelligence/${o.id}/push-daily-os`,
                  )
                }
              >
                {t("opportunityIntel.pushDailyOs")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs">
        <Link className="twin-link" href="/dashboard/strategy">
          {t("careerStrategy.eyebrow")}
        </Link>
        {" · "}
        <Link className="twin-link" href="/dashboard/application-studio">
          {t("applicationStudio.eyebrow")}
        </Link>
      </p>
      <p className="text-xs text-[var(--twin-muted)]">{t("opportunityIntel.disclaimer")}</p>
    </Card>
  );
}
