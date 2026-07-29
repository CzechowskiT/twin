"use client";

/**
 * Acceptance Calendar cockpit — commitments worth accepting onto a real calendar.
 * Internal planning only; proposed holds are never claimed as externally booked.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

const API = "/api/v1/candidates/me/acceptance-calendar";

type CalItem = {
  id: number;
  title: string;
  category: string;
  state: string;
  importance: number;
  claim_kind?: string;
  due_at?: string | null;
  starts_at?: string | null;
  at_risk?: boolean;
  deep_link?: string | null;
};

type Hold = {
  id: number;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  externally_booked?: boolean;
  claim_kind?: string;
};

type Aggregate = {
  today?: CalItem[];
  agenda?: CalItem[];
  unscheduled?: CalItem[];
  at_risk?: CalItem[];
  holds?: Hold[];
  feasibility?: { status?: string; planned_hours?: number; budget_hours_per_week?: number; explain?: { why: string }[] };
  conflicts?: { kind: string; note?: string; claim_kind?: string }[];
  path?: { outcome?: { title?: string; hiring_certainty?: string } | null; next_steps?: CalItem[] };
  microsoft?: { mode?: string; write_enabled?: boolean; limitation?: string | null; note?: string };
  safety?: { microsoft_write?: boolean; autonomous_scheduling?: boolean };
  budget?: { hours_per_week?: number; timezone?: string };
  labels?: Record<string, string>;
};

function Claim({ kind }: { kind?: string }) {
  if (!kind) return null;
  return (
    <span className="ml-1 rounded border border-[var(--twin-border)] px-1 text-[10px] uppercase tracking-wide text-neutral-500">
      {kind}
    </span>
  );
}

export function AcceptanceCalendarPanel({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [data, setData] = useState<Aggregate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"today" | "agenda" | "unscheduled">("today");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setError(null);
    try {
      const res = await apiFetch<Aggregate>(API, {}, token);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("acceptanceCalendar.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function itemAction(id: number, action: string) {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`${API}/items/${id}/action`, { method: "POST", body: JSON.stringify({ action }) }, token);
      await load();
    } catch {
      setError(t("acceptanceCalendar.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function proposeHolds() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`${API}/holds/propose`, { method: "POST", body: "{}" }, token);
      await load();
    } catch {
      setError(t("acceptanceCalendar.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function holdAction(id: number, action: string) {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `${API}/holds/${id}/action`,
        { method: "POST", body: JSON.stringify({ action }) },
        token,
      );
      await load();
    } catch {
      setError(t("acceptanceCalendar.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  const items =
    view === "today" ? data?.today || [] : view === "unscheduled" ? data?.unscheduled || [] : data?.agenda || [];

  return (
    <section className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">{t("acceptanceCalendar.eyebrow")}</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">{t("acceptanceCalendar.title")}</h2>
          <p className="twin-muted mt-1 max-w-2xl text-sm">{t("acceptanceCalendar.lead")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="border border-[var(--twin-border)] bg-transparent text-xs"
            disabled={busy}
            onClick={() => void load()}
          >
            {t("acceptanceCalendar.refresh")}
          </Button>
          <Button type="button" className="text-xs" disabled={busy} onClick={() => void proposeHolds()}>
            {t("acceptanceCalendar.proposeHolds")}
          </Button>
          <a
            className="inline-flex items-center rounded border border-[var(--twin-border)] px-3 py-1.5 text-xs"
            href={`${API}/ics`}
            onClick={(e) => {
              const token = getToken();
              if (!token) {
                e.preventDefault();
                return;
              }
              e.preventDefault();
              void (async () => {
                try {
                  const res = await fetch(`${API}/ics`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!res.ok) throw new Error("ics");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "twin-acceptance.ics";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  setError(t("acceptanceCalendar.icsFailed"));
                }
              })();
            }}
          >
            {t("acceptanceCalendar.exportIcs")}
          </a>
        </div>
      </div>

      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      <div className={`mt-4 grid gap-3 ${compact ? "" : "sm:grid-cols-3"}`}>
        <div className="rounded border border-[var(--twin-border)] p-3">
          <p className="text-xs text-neutral-500">{t("acceptanceCalendar.feasibility")}</p>
          <p className="mt-1 text-sm font-medium">{data?.feasibility?.status || "—"}</p>
          <p className="twin-muted text-xs">
            {data?.feasibility?.planned_hours ?? "—"}h / {data?.feasibility?.budget_hours_per_week ?? "—"}h
          </p>
          <Claim kind="INFERENCE" />
        </div>
        <div className="rounded border border-[var(--twin-border)] p-3">
          <p className="text-xs text-neutral-500">{t("acceptanceCalendar.path")}</p>
          <p className="mt-1 text-sm font-medium">{data?.path?.outcome?.title || t("acceptanceCalendar.noOutcome")}</p>
          <p className="twin-muted text-xs">
            {t("acceptanceCalendar.hiringCertainty")}: {data?.path?.outcome?.hiring_certainty || "UNKNOWN"}
          </p>
          <Claim kind="SUGGESTION" />
        </div>
        <div className="rounded border border-[var(--twin-border)] p-3">
          <p className="text-xs text-neutral-500">{t("acceptanceCalendar.microsoft")}</p>
          <p className="mt-1 text-sm font-medium">{data?.microsoft?.mode || "internal_only"}</p>
          <p className="twin-muted text-xs">
            {t("acceptanceCalendar.msWriteOff")} · {data?.microsoft?.limitation || t("acceptanceCalendar.internalMode")}
          </p>
          <Claim kind={data?.microsoft?.write_enabled ? "FACT" : "FACT"} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["today", "acceptanceCalendar.viewToday"],
            ["agenda", "acceptanceCalendar.viewAgenda"],
            ["unscheduled", "acceptanceCalendar.viewUnscheduled"],
          ] as const
        ).map(([v, key]) => (
          <button
            key={v}
            type="button"
            className={`rounded border px-2 py-1 text-xs ${view === v ? "border-neutral-800" : "border-[var(--twin-border)]"}`}
            onClick={() => setView(v)}
          >
            {t(key)}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-2">
        {items.slice(0, compact ? 4 : 10).map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded border border-[var(--twin-border)] px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">
                {item.title}
                {item.at_risk ? (
                  <span className="ml-2 text-[10px] uppercase text-amber-700">{t("acceptanceCalendar.atRisk")}</span>
                ) : null}
              </p>
              <p className="twin-muted text-xs">
                {item.category} · {item.state} · {item.starts_at || item.due_at || t("acceptanceCalendar.unscheduled")}
              </p>
              <Claim kind={item.claim_kind} />
              {item.deep_link ? (
                <Link href={item.deep_link} className="mt-1 inline-block text-xs underline">
                  {t("acceptanceCalendar.open")}
                </Link>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                className="border border-[var(--twin-border)] bg-transparent text-xs"
                disabled={busy}
                onClick={() => void itemAction(item.id, "protect")}
              >
                {t("acceptanceCalendar.protect")}
              </Button>
              <Button
                type="button"
                className="border border-[var(--twin-border)] bg-transparent text-xs"
                disabled={busy}
                onClick={() => void itemAction(item.id, "postpone")}
              >
                {t("acceptanceCalendar.postpone")}
              </Button>
              <Button
                type="button"
                className="border border-[var(--twin-border)] bg-transparent text-xs"
                disabled={busy}
                onClick={() => void itemAction(item.id, "complete")}
              >
                {t("acceptanceCalendar.complete")}
              </Button>
            </div>
          </li>
        ))}
        {items.length === 0 ? <li className="twin-muted text-sm">{t("acceptanceCalendar.empty")}</li> : null}
      </ul>

      {!compact ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-neutral-500">{t("acceptanceCalendar.holds")}</p>
          <ul className="mt-2 space-y-2">
            {(data?.holds || []).slice(0, 5).map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--twin-border)] px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{h.title}</p>
                  <p className="twin-muted text-xs">
                    {h.status} · {h.starts_at} → {h.ends_at} · {t("acceptanceCalendar.notExternallyBooked")}
                  </p>
                  <Claim kind={h.claim_kind || "SUGGESTION"} />
                </div>
                <div className="flex gap-1">
                  <Button type="button" className="text-xs" disabled={busy} onClick={() => void holdAction(h.id, "accept")}>
                    {t("acceptanceCalendar.acceptHold")}
                  </Button>
                  <Button
                    type="button"
                    className="border border-[var(--twin-border)] bg-transparent text-xs"
                    disabled={busy}
                    onClick={() => void holdAction(h.id, "dismiss")}
                  >
                    {t("acceptanceCalendar.dismiss")}
                  </Button>
                </div>
              </li>
            ))}
            {(data?.holds || []).length === 0 ? (
              <li className="twin-muted text-sm">{t("acceptanceCalendar.noHolds")}</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {(data?.conflicts || []).length ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-neutral-500">{t("acceptanceCalendar.conflicts")}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {(data?.conflicts || []).slice(0, 4).map((c, i) => (
              <li key={`${c.kind}-${i}`}>
                {c.kind}
                {c.note ? `: ${c.note}` : ""}
                <Claim kind={c.claim_kind} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="twin-muted mt-3 text-[11px]">{t("acceptanceCalendar.disclaimer")}</p>
      <p className="twin-muted mt-1 text-[11px]">{data?.labels?.proposed || t("acceptanceCalendar.proposedLabel")}</p>
    </section>
  );
}
