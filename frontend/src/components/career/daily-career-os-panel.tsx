"use client";

/**
 * Daily Career Operating System cockpit — above-fold on /dashboard and /dashboard/career.
 * No Wave/Gate/LIVE/CU/Pilot jargon. Dismissible / snoozable / reversible.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

const API = "/api/v1/candidates/me/career-copilot/daily";

type InboxItem = {
  id: number;
  title: string;
  kind: string;
  status: string;
  priority_score: number;
  deep_link?: string | null;
  effort?: string | null;
  completion_criterion?: string | null;
  claim_kind?: string;
  priority_explain?: { factors?: { factor: string; why: string }[] };
};

type DailyPayload = {
  daily_os?: {
    brief?: {
      headline?: string;
      status?: string;
      body?: {
        next_action?: InboxItem | null;
        what_changed?: { title?: string; change_kind?: string }[];
        neglecting?: InboxItem[];
        momentum?: { score?: number; note?: string };
        risks?: { title?: string; severity?: string }[];
      };
      context_version?: number;
    };
    inbox?: InboxItem[];
    cadence?: { quiet_mode?: boolean; intensity?: string; daily_cap?: number };
    privacy?: { briefs_enabled?: boolean; learning_enabled?: boolean };
    continuity?: { never_starts_from_zero?: boolean };
    safety?: { external_auto_action?: boolean; ai_kill_switch?: boolean };
  };
};

function ClaimBadge({ kind }: { kind?: string }) {
  const k = (kind || "UNKNOWN").toUpperCase();
  const color =
    k === "FACT"
      ? "bg-emerald-100 text-emerald-900"
      : k === "INFERENCE"
        ? "bg-sky-100 text-sky-900"
        : k === "SUGGESTION"
          ? "bg-amber-100 text-amber-900"
          : "bg-neutral-100 text-neutral-700";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${color}`}>
      {k}
    </span>
  );
}

type Props = { compact?: boolean };

export function DailyCareerOsPanel({ compact = false }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<DailyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setError(null);
    try {
      const d = await apiFetch<DailyPayload>(API, {}, token);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dailyOs.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function briefAction(action: "dismiss" | "snooze" | "reopen") {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `${API}/brief/action`,
        { method: "POST", body: JSON.stringify({ action, snooze_hours: action === "snooze" ? 4 : undefined }) },
        token,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dailyOs.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function inboxAction(id: number, action: string) {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `${API}/inbox/${id}/action`,
        { method: "POST", body: JSON.stringify({ action }) },
        token,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dailyOs.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="twin-muted text-sm">{t("common.loadingEllipsis")}</p>;
  }

  const os = data?.daily_os;
  const brief = os?.brief;
  const inbox = os?.inbox || [];

  if (brief?.status === "dismissed" || brief?.status === "snoozed") {
    return (
      <section
        className="mb-6 rounded-lg border border-[var(--twin-border)] p-4"
        data-testid="daily-career-os-panel"
      >
        <p className="text-sm text-[var(--twin-muted)]">
          {brief.status === "snoozed" ? t("dailyOs.briefSnoozed") : t("dailyOs.briefDismissed")}
        </p>
        <Button
          type="button"
          className="mt-2 border border-[var(--twin-border)] bg-transparent"
          disabled={busy}
          onClick={() => void briefAction("reopen")}
        >
          {t("dailyOs.reopen")}
        </Button>
      </section>
    );
  }

  return (
    <section
      className="mb-6 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised,transparent)] p-4"
      data-testid="daily-career-os-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-accent-hover)]">
            {t("dailyOs.eyebrow")}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)] sm:text-xl">
            {brief?.headline || t("dailyOs.fallbackHeadline")}
          </h2>
          <p className="twin-muted mt-1 max-w-prose text-sm">{t("dailyOs.lead")}</p>
          {os?.continuity?.never_starts_from_zero ? (
            <p className="mt-1 text-xs text-emerald-800">{t("dailyOs.continuity")}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="border border-[var(--twin-border)] bg-transparent"
            disabled={busy}
            onClick={() => void briefAction("snooze")}
          >
            {t("dailyOs.snooze")}
          </Button>
          <Button
            type="button"
            className="border border-[var(--twin-border)] bg-transparent"
            disabled={busy}
            onClick={() => void briefAction("dismiss")}
          >
            {t("dailyOs.dismiss")}
          </Button>
        </div>
      </div>

      {os?.safety?.ai_kill_switch ? (
        <p className="mt-2 text-xs text-amber-800">{t("dailyOs.degraded")}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      <div className={`mt-4 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div className="rounded border border-[var(--twin-border)] p-3">
          <p className="text-xs text-neutral-500">{t("dailyOs.nextAction")}</p>
          <p className="mt-1 text-sm font-medium">{brief?.body?.next_action?.title || "—"}</p>
          {brief?.body?.next_action?.completion_criterion ? (
            <p className="twin-muted mt-1 text-xs">{brief.body.next_action.completion_criterion}</p>
          ) : null}
          <ClaimBadge kind={brief?.body?.next_action?.claim_kind} />
          {brief?.body?.next_action?.deep_link ? (
            <Link href={brief.body.next_action.deep_link} className="mt-2 inline-block text-xs underline">
              {t("dailyOs.open")}
            </Link>
          ) : null}
        </div>
        <div className="rounded border border-[var(--twin-border)] p-3">
          <p className="text-xs text-neutral-500">{t("dailyOs.whatChanged")}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {(brief?.body?.what_changed || []).slice(0, 3).map((c, i) => (
              <li key={`${c.title}-${i}`}>
                {c.change_kind}: {c.title}
              </li>
            ))}
            {(brief?.body?.what_changed || []).length === 0 ? (
              <li className="twin-muted">{t("dailyOs.noChanges")}</li>
            ) : null}
          </ul>
        </div>
        {!compact ? (
          <>
            <div className="rounded border border-[var(--twin-border)] p-3">
              <p className="text-xs text-neutral-500">{t("dailyOs.momentum")}</p>
              <p className="mt-1 text-sm font-medium">{brief?.body?.momentum?.score ?? "—"}</p>
              <p className="twin-muted text-xs">{brief?.body?.momentum?.note}</p>
              <ClaimBadge kind="INFERENCE" />
            </div>
            <div className="rounded border border-[var(--twin-border)] p-3">
              <p className="text-xs text-neutral-500">{t("dailyOs.risks")}</p>
              <ul className="mt-1 space-y-1 text-sm">
                {(brief?.body?.risks || []).slice(0, 3).map((r) => (
                  <li key={r.title}>
                    {r.title} ({r.severity})
                  </li>
                ))}
                {(brief?.body?.risks || []).length === 0 ? (
                  <li className="twin-muted">{t("dailyOs.noRisks")}</li>
                ) : null}
              </ul>
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-neutral-500">{t("dailyOs.inbox")}</p>
        <ul className="mt-2 space-y-2">
          {inbox.slice(0, compact ? 3 : 6).map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded border border-[var(--twin-border)] px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="twin-muted text-xs">
                  {item.kind} · {item.status} · {item.effort || "—"}
                </p>
                <ClaimBadge kind={item.claim_kind} />
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  className="border border-[var(--twin-border)] bg-transparent text-xs"
                  disabled={busy}
                  onClick={() => void inboxAction(item.id, "complete")}
                >
                  {t("dailyOs.complete")}
                </Button>
                <Button
                  type="button"
                  className="border border-[var(--twin-border)] bg-transparent text-xs"
                  disabled={busy}
                  onClick={() => void inboxAction(item.id, "dismiss")}
                >
                  {t("dailyOs.dismiss")}
                </Button>
              </div>
            </li>
          ))}
          {inbox.length === 0 ? <li className="twin-muted text-sm">{t("dailyOs.inboxEmpty")}</li> : null}
        </ul>
      </div>

      <p className="twin-muted mt-3 text-[11px]">{t("dailyOs.disclaimer")}</p>
      <p className="twin-muted mt-1 text-[11px]">{t("dailyOs.reminderDelivery")}</p>
    </section>
  );
}
