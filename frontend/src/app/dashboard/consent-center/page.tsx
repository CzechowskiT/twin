"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Consent = {
  ms_busy_read_opt_in?: boolean;
  store_availability_blocks?: boolean;
  ics_export_opt_in?: boolean;
  internal_calendar_enabled?: boolean;
  version?: number;
  default_off?: boolean;
};

type Aggregate = {
  consent?: Consent;
  connection?: { status?: string; token_health?: string; scopes?: string[] };
  microsoft?: { write_scopes_present?: boolean; microsoft_calendar_write_enabled?: boolean };
  safety?: Record<string, boolean | string>;
  routes?: Record<string, string>;
};

export default function ConsentCenterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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
      setErr(ex instanceof Error ? ex.message : t("consentCenter.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function patch(body: Record<string, boolean>) {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch("/api/v1/candidates/me/calendar-sync/consent", {
        method: "PATCH",
        body: JSON.stringify(body),
      }, token);
      setMsg(t("consentCenter.saved"));
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("consentCenter.actionFailed"));
    }
  }

  const c = agg?.consent;

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("consentCenter.eyebrow")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <p className="text-sm uppercase tracking-wide text-[var(--twin-muted)]">
          {t("consentCenter.eyebrow")}
        </p>
        <h1 className="text-3xl font-semibold">{t("consentCenter.title")}</h1>
        <p className="text-sm text-[var(--twin-muted)]">{t("consentCenter.lead")}</p>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {msg ? <p className="text-sm text-[var(--twin-muted)]">{msg}</p> : null}

        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("consentCenter.togglesTitle")}</h2>
          <ul className="flex flex-col gap-4 text-sm">
            {(
              [
                ["ms_busy_read_opt_in", "msBusyRead", c?.ms_busy_read_opt_in],
                ["store_availability_blocks", "storeBusy", c?.store_availability_blocks],
                ["ics_export_opt_in", "icsExport", c?.ics_export_opt_in],
                ["internal_calendar_enabled", "internalCalendar", c?.internal_calendar_enabled],
              ] as const
            ).map(([key, labelKey, on]) => (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--twin-border)] py-2"
              >
                <span>
                  {t(`consentCenter.${labelKey}`)} · v{c?.version ?? "—"} · default_off=
                  {String(!!c?.default_off)}
                </span>
                <span className="flex gap-2">
                  <Button type="button" onClick={() => void patch({ [key]: true })}>
                    {t("consentCenter.enable")} ({String(!!on)})
                  </Button>
                  <Button type="button" onClick={() => void patch({ [key]: false })}>
                    {t("consentCenter.revoke")}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--twin-muted)]">{t("consentCenter.disclaimer")}</p>
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-semibold">{t("consentCenter.connectionTitle")}</h2>
          <p className="text-sm">
            status={agg?.connection?.status} · token_health={agg?.connection?.token_health} ·
            write_scopes={String(!!agg?.microsoft?.write_scopes_present)} · ms_write=
            {String(!!agg?.microsoft?.microsoft_calendar_write_enabled)}
          </p>
          <p className="mt-3 text-sm">
            <Link className="twin-link" href="/dashboard/calendar-sync">
              {t("calendarSync.eyebrow")}
            </Link>
            {" · "}
            <Link className="twin-link" href="/dashboard/calendar">
              {t("dashboard.calendarLink")}
            </Link>
          </p>
        </Card>
      </main>
    </Shell>
  );
}
