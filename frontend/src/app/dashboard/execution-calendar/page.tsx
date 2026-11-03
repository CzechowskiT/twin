"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { IaActionableEmpty } from "@/components/dashboard/ia-actionable-empty";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Requirement = {
  id: number;
  decision_id?: number | null;
  status: string;
  title: string;
  effort_minutes?: number;
  stale?: boolean;
  spawns_commitments?: boolean;
};

type BatchItem = {
  id: number;
  status: string;
  title: string;
  starts_at?: string | null;
  ends_at?: string | null;
  is_hold?: boolean;
  external_created?: boolean;
  external_confirmed?: boolean;
  progress?: { percent?: number; inferred_completion?: boolean; slippage?: boolean };
};

type Batch = {
  id: number;
  status: string;
  version?: number;
  external_created?: boolean;
  items?: BatchItem[];
  feasibility?: { feasible?: boolean; conflicts_count?: number };
  holds_are_external_booking?: boolean;
};

type Aggregate = {
  requirements?: Requirement[];
  batches?: Batch[];
  capacity?: {
    budget_minutes?: number | null;
    demanded_minutes?: number;
    remaining_minutes?: number | null;
    status?: string;
    explicit_budget_only?: boolean;
    inferred_obligations?: boolean;
  };
  capacity_profile?: {
    weekly_budget_minutes?: number | null;
    timezone_name?: string;
    explicit_budget_only?: boolean;
  } | null;
  snapshots?: { id: number; source_mode?: string; fabricated?: boolean; unknown_availability?: boolean }[];
  conflicts?: { id: number; kind: string; status: string }[];
  microsoft?: Record<string, unknown>;
  safety?: Record<string, unknown>;
  alembic?: string;
  routes?: Record<string, string>;
};

function ExecutionCalendarContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get("view") || "home";
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [budget, setBudget] = useState("300");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<Aggregate>("/api/v1/candidates/me/execution-calendar", {}, token);
      setAgg(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("executionCalendar.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function act(path: string, body: Record<string, unknown> = {}, method = "POST") {
    const token = getToken();
    if (!token) return null;
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
      setErr(ex instanceof Error ? ex.message : t("executionCalendar.actionFailed"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  const capacity = agg?.capacity;
  const batches = agg?.batches || [];
  const reqs = agg?.requirements || [];

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("executionCalendar.eyebrow")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header>
          <p className="text-sm uppercase tracking-wide text-[var(--twin-muted)]">
            {t("executionCalendar.eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold">{t("executionCalendar.title")}</h1>
          <p className="text-sm text-[var(--twin-muted)]">{t("executionCalendar.lead")}</p>
        </header>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {statusMsg ? (
          <p className="text-sm text-[var(--twin-muted)]" role="status">
            {statusMsg}
          </p>
        ) : null}

        <IaActionableEmpty areaId="plan" show={!err} isError={Boolean(err)} />

        <nav className="flex flex-wrap gap-3 text-sm" aria-label={t("executionCalendar.views")}>
          {(["home", "batches", "capacity", "availability", "conflicts", "history"] as const).map(
            (v) => {
              const key = (
                {
                  home: "viewHome",
                  batches: "viewBatches",
                  capacity: "viewCapacity",
                  availability: "viewAvailability",
                  conflicts: "viewConflicts",
                  history: "viewHistory",
                } as const
              )[v];
              return (
                <Link key={v} className="twin-link" href={`/dashboard/execution-calendar?view=${v}`}>
                  {t(`executionCalendar.${key}`)}
                </Link>
              );
            },
          )}
        </nav>

        {(view === "home" || view === "capacity") && (
          <Card className="flex flex-col gap-3" data-capacity>
            <h2 className="text-lg font-semibold">{t("executionCalendar.capacityTitle")}</h2>
            <p className="text-sm text-[var(--twin-muted)]">
              status={capacity?.status || "INSUFFICIENT_DATA"} · budget=
              {capacity?.budget_minutes ?? "—"} · demanded={capacity?.demanded_minutes ?? 0} ·
              remaining={capacity?.remaining_minutes ?? "—"} · explicit=
              {String(!!capacity?.explicit_budget_only)} · inferred=
              {String(!!capacity?.inferred_obligations)}
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t("executionCalendar.budgetLabel")}</span>
              <input
                className="rounded border border-[var(--twin-border)] bg-transparent px-3 py-2"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                const mins = Number(budget);
                const start = new Date();
                start.setHours(start.getHours() + 2, 0, 0, 0);
                const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
                void act("/api/v1/candidates/me/execution-calendar/capacity", {
                  weekly_budget_minutes: Number.isFinite(mins) ? mins : null,
                  timezone_name: "UTC",
                  windows: [
                    {
                      starts_at: start.toISOString(),
                      ends_at: end.toISOString(),
                    },
                  ],
                  protected_focus: { enabled: false, blocks: [] },
                }).then(() => setStatusMsg(t("executionCalendar.budgetSaved")));
              }}
            >
              {t("executionCalendar.saveBudget")}
            </Button>
          </Card>
        )}

        {(view === "home" || view === "availability") && (
          <Card className="flex flex-col gap-3" data-availability>
            <h2 className="text-lg font-semibold">{t("executionCalendar.availabilityTitle")}</h2>
            <p className="text-sm text-[var(--twin-muted)]">
              ms_write={String(!!agg?.microsoft?.write_enabled)} · write_scopes=
              {String(!!agg?.microsoft?.write_scopes_present)} · internal_only=
              {String(!!agg?.microsoft?.internal_only_mode)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act("/api/v1/candidates/me/execution-calendar/availability/snapshots", {
                    use_microsoft_busy: false,
                  }).then(() => setStatusMsg(t("executionCalendar.snapshotInternal")))
                }
              >
                {t("executionCalendar.snapshotInternalBtn")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act("/api/v1/candidates/me/execution-calendar/availability/snapshots", {
                    use_microsoft_busy: true,
                    synthetic_busy: [],
                  }).then(() => setStatusMsg(t("executionCalendar.snapshotMs")))
                }
              >
                {t("executionCalendar.snapshotMsBtn")}
              </Button>
            </div>
            <ul className="text-sm">
              {(agg?.snapshots || []).map((s) => (
                <li key={s.id} className="border-b border-[var(--twin-border)] py-2">
                  #{s.id} · {s.source_mode} · fabricated={String(!!s.fabricated)} · unknown=
                  {String(!!s.unknown_availability)}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(view === "home" || view === "batches") && (
          <Card className="flex flex-col gap-3" data-batches>
            <h2 className="text-lg font-semibold">{t("executionCalendar.batchesTitle")}</h2>
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void act("/api/v1/candidates/me/execution-calendar/batches", {}).then((out) => {
                  if (out) setStatusMsg(t("executionCalendar.batchProposed"));
                })
              }
            >
              {t("executionCalendar.proposeBatch")}
            </Button>
            <ul className="flex flex-col gap-3 text-sm">
              {batches.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-col gap-2 border-b border-[var(--twin-border)] py-3"
                  data-batch-id={b.id}
                >
                  <span>
                    batch #{b.id} · {b.status} · v{b.version ?? 1} · external_created=
                    {String(!!b.external_created)} · hold_booking=
                    {String(!!b.holds_are_external_booking)}
                  </span>
                  <span className="text-xs text-[var(--twin-muted)]">
                    feasible={String(!!b.feasibility?.feasible)} · conflicts=
                    {b.feasibility?.conflicts_count ?? 0} · items={(b.items || []).length}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {b.status === "draft" ? (
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void act(`/api/v1/candidates/me/execution-calendar/batches/${b.id}/propose`)
                        }
                      >
                        {t("executionCalendar.sendApproval")}
                      </Button>
                    ) : null}
                    {b.status === "pending_approval" ? (
                      <>
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              `/api/v1/candidates/me/execution-calendar/batches/${b.id}/resolve`,
                              { action: "approve" },
                            ).then((out) =>
                              setStatusMsg(
                                `${t("executionCalendar.approved")} acal=${String(out?.acal_created ?? 0)}`,
                              ),
                            )
                          }
                        >
                          {t("executionCalendar.approve")}
                        </Button>
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              `/api/v1/candidates/me/execution-calendar/batches/${b.id}/resolve`,
                              { action: "reject" },
                            )
                          }
                        >
                          {t("executionCalendar.reject")}
                        </Button>
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              `/api/v1/candidates/me/execution-calendar/batches/${b.id}/resolve`,
                              { action: "postpone" },
                            )
                          }
                        >
                          {t("executionCalendar.postpone")}
                        </Button>
                      </>
                    ) : null}
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const out = await act(
                          `/api/v1/candidates/me/execution-calendar/batches/${b.id}/ics`,
                          {},
                          "GET",
                        );
                        if (out) {
                          setStatusMsg(
                            `${t("executionCalendar.icsReady")} confirm=${String(!!out.ics_is_confirmation)} attendees=${String(!!out.attendees_included)}`,
                          );
                        }
                      }}
                    >
                      {t("executionCalendar.exportIcs")}
                    </Button>
                  </span>
                  <ul className="pl-2">
                    {(b.items || []).map((it) => (
                      <li key={it.id} className="flex flex-col gap-1 py-1">
                        <span>
                          item #{it.id} · {it.status} · hold={String(!!it.is_hold)} · ext=
                          {String(!!it.external_created)} · confirmed=
                          {String(!!it.external_confirmed)} · inferred_done=
                          {String(!!it.progress?.inferred_completion)}
                        </span>
                        {it.status === "approved" ? (
                          <span className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void act(
                                  `/api/v1/candidates/me/execution-calendar/items/${it.id}/progress`,
                                  { percent: 50, actual_effort_minutes: 30 },
                                )
                              }
                            >
                              {t("executionCalendar.logEffort")}
                            </Button>
                            <Button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void act(
                                  `/api/v1/candidates/me/execution-calendar/items/${it.id}/confirm-external`,
                                  { confirmed: true },
                                )
                              }
                            >
                              {t("executionCalendar.confirmExternal")}
                            </Button>
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(view === "home" || view === "conflicts" || view === "history") && (
          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t("executionCalendar.requirementsTitle")}</h2>
            <ul className="text-sm">
              {reqs.length === 0 ? (
                <li>{t("executionCalendar.requirementsEmpty")}</li>
              ) : (
                reqs.map((r) => (
                  <li key={r.id} className="border-b border-[var(--twin-border)] py-2">
                    #{r.id} · {r.status} · decision={r.decision_id ?? "—"} · stale=
                    {String(!!r.stale)} · spawn={String(!!r.spawns_commitments)} · {r.title}
                  </li>
                ))
              )}
            </ul>
            <h3 className="text-base font-semibold">{t("executionCalendar.conflictsTitle")}</h3>
            <ul className="text-sm">
              {(agg?.conflicts || []).length === 0 ? (
                <li>{t("executionCalendar.conflictsEmpty")}</li>
              ) : (
                (agg?.conflicts || []).map((c) => (
                  <li key={c.id} className="border-b border-[var(--twin-border)] py-2">
                    #{c.id} · {c.kind} · {c.status}
                  </li>
                ))
              )}
            </ul>
          </Card>
        )}

        <p className="text-xs text-[var(--twin-muted)]">
          alembic={agg?.alembic || "—"} ·{" "}
          <Link className="twin-link" href="/dashboard/decision-journal">
            {t("decisionJournal.eyebrow")}
          </Link>
          {" · "}
          <Link className="twin-link" href="/dashboard/acceptance">
            {t("executionCalendar.acalLink")}
          </Link>
          {" · "}
          <Link className="twin-link" href="/dashboard/career">
            {t("executionCalendar.dailyOsLink")}
          </Link>
          {" · "}
          {t("executionCalendar.disclaimer")}
        </p>
      </main>
    </Shell>
  );
}

export default function ExecutionCalendarPage() {
  return (
    <Suspense fallback={null}>
      <ExecutionCalendarContent />
    </Suspense>
  );
}
