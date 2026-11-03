"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Aggregate = {
  connection?: { status?: string; token_health?: string; last_sync_at?: string | null };
  sync_runs?: { id: number; status: string; mode: string; busy_count: number }[];
  deltas?: { id: number; kind: string; added?: unknown[]; removed?: unknown[] }[];
  recalculations?: { id: number; status: string; silent?: boolean; acal_mutated?: boolean }[];
  feeds?: { id: number; status: string; token_version: number; external_booking?: boolean }[];
  safety?: Record<string, boolean | string>;
  routes?: Record<string, string>;
  alembic?: string;
};

function CalendarSyncInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get("view") || "home";
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [feedToken, setFeedToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<Aggregate>("/api/v1/candidates/me/calendar-sync", {}, token);
      setAgg(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("calendarSync.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function act(path: string, body?: object) {
    const token = getToken();
    if (!token) return null;
    try {
      const out = await apiFetch<Record<string, unknown>>(
        path,
        { method: "POST", body: body ? JSON.stringify(body) : undefined },
        token,
      );
      setMsg(t("calendarSync.actionOk"));
      await load();
      return out;
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("calendarSync.actionFailed"));
      return null;
    }
  }

  const views = useMemo(
    () =>
      (
        [
          ["home", "viewHome"],
          ["connection", "viewConnection"],
          ["deltas", "viewDeltas"],
          ["history", "viewHistory"],
          ["feed", "viewFeed"],
        ] as const
      ),
    [],
  );

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("calendarSync.eyebrow")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <p className="text-sm uppercase tracking-wide text-[var(--twin-muted)]">
          {t("calendarSync.eyebrow")}
        </p>
        <h1 className="text-3xl font-semibold">{t("calendarSync.title")}</h1>
        <p className="text-sm text-[var(--twin-muted)]">{t("calendarSync.lead")}</p>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {msg ? <p className="text-sm text-[var(--twin-muted)]">{msg}</p> : null}

        <nav className="flex flex-wrap gap-3 text-sm" aria-label={t("calendarSync.views")}>
          {views.map(([v, key]) => (
            <Link key={v} className="twin-link" href={`/dashboard/calendar-sync?view=${v}`}>
              {t(`calendarSync.${key}`)}
            </Link>
          ))}
        </nav>

        <Card>
          <p className="text-sm">
            alembic={agg?.alembic} · connection={agg?.connection?.status} · silent_rewrite=
            {String(!!agg?.safety?.silent_approved_plan_rewrite)} · ms_write=
            {String(!!agg?.safety?.microsoft_calendar_write)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() =>
                void act("/api/v1/candidates/me/calendar-sync/runs", {
                  synthetic_busy: [
                    {
                      starts_at: new Date(Date.now() + 86400000).toISOString(),
                      ends_at: new Date(Date.now() + 90000000).toISOString(),
                    },
                  ],
                })
              }
            >
              {t("calendarSync.runSync")}
            </Button>
            <Button
              type="button"
              onClick={() => void act("/api/v1/candidates/me/calendar-sync/disconnect")}
            >
              {t("calendarSync.disconnect")}
            </Button>
          </div>
        </Card>

        {(view === "home" || view === "deltas") && (
          <Card>
            <h2 className="mb-3 text-lg font-semibold">{t("calendarSync.recalcTitle")}</h2>
            <ul className="flex flex-col gap-3 text-sm">
              {(agg?.recalculations || []).map((p) => (
                <li key={p.id} className="flex flex-wrap gap-2 border-b border-[var(--twin-border)] py-2">
                  <span>
                    #{p.id} · {p.status} · silent={String(!!p.silent)} · acal_mutated=
                    {String(!!p.acal_mutated)}
                  </span>
                  {p.status === "pending" ? (
                    <span className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() =>
                          void act(
                            `/api/v1/candidates/me/calendar-sync/recalculations/${p.id}/resolve`,
                            { action: "approve" },
                          )
                        }
                      >
                        {t("calendarSync.approve")}
                      </Button>
                      <Button
                        type="button"
                        onClick={() =>
                          void act(
                            `/api/v1/candidates/me/calendar-sync/recalculations/${p.id}/resolve`,
                            { action: "reject" },
                          )
                        }
                      >
                        {t("calendarSync.reject")}
                      </Button>
                      <Button
                        type="button"
                        onClick={() =>
                          void act(
                            `/api/v1/candidates/me/calendar-sync/recalculations/${p.id}/resolve`,
                            { action: "postpone" },
                          )
                        }
                      >
                        {t("calendarSync.postpone")}
                      </Button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <h3 className="mb-2 mt-4 text-base font-semibold">{t("calendarSync.deltasTitle")}</h3>
            <ul className="text-sm">
              {(agg?.deltas || []).map((d) => (
                <li key={d.id}>
                  delta #{d.id} · {d.kind} · +{d.added?.length ?? 0}/-{d.removed?.length ?? 0}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(view === "home" || view === "history" || view === "connection") && (
          <Card>
            <h2 className="mb-3 text-lg font-semibold">{t("calendarSync.runsTitle")}</h2>
            <ul className="text-sm">
              {(agg?.sync_runs || []).map((r) => (
                <li key={r.id}>
                  run #{r.id} · {r.status} · {r.mode} · busy={r.busy_count}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(view === "home" || view === "feed") && (
          <Card>
            <h2 className="mb-3 text-lg font-semibold">{t("calendarSync.feedTitle")}</h2>
            <Button
              type="button"
              onClick={() =>
                void act("/api/v1/candidates/me/calendar-sync/feeds").then((out) => {
                  if (out && typeof out.token === "string") setFeedToken(out.token);
                })
              }
            >
              {t("calendarSync.mintFeed")}
            </Button>
            {feedToken ? (
              <p className="mt-2 text-xs text-[var(--twin-muted)]">
                {t("calendarSync.feedTokenOnce")} (path only, token not re-shown in report)
              </p>
            ) : null}
            <ul className="mt-3 text-sm">
              {(agg?.feeds || []).map((f) => (
                <li key={f.id} className="flex flex-wrap gap-2 py-1">
                  feed #{f.id} · {f.status} · v{f.token_version} · external_booking=
                  {String(!!f.external_booking)}
                  <Button
                    type="button"
                    onClick={() =>
                      void act(`/api/v1/candidates/me/calendar-sync/feeds/${f.id}/rotate`).then(
                        (out) => {
                          if (out && typeof out.token === "string") setFeedToken(out.token);
                        },
                      )
                    }
                  >
                    {t("calendarSync.rotateFeed")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      void act(`/api/v1/candidates/me/calendar-sync/feeds/${f.id}/revoke`)
                    }
                  >
                    {t("calendarSync.revokeFeed")}
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[var(--twin-muted)]">{t("calendarSync.feedDisclaimer")}</p>
          </Card>
        )}

        <p className="text-sm">
          <Link className="twin-link" href="/dashboard/consent-center">
            {t("consentCenter.eyebrow")}
          </Link>
          {" · "}
          <Link className="twin-link" href="/dashboard/execution-calendar">
            {t("executionCalendar.eyebrow")}
          </Link>
          {" · "}
          <Link className="twin-link" href="/dashboard/career">
            {t("calendarSync.dailyOsLink")}
          </Link>
        </p>
        <p className="text-xs text-[var(--twin-muted)]">{t("calendarSync.disclaimer")}</p>
      </main>
    </Shell>
  );
}

export default function CalendarSyncPage() {
  return (
    <Suspense fallback={null}>
      <CalendarSyncInner />
    </Suspense>
  );
}
