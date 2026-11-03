"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type ContinueItem = {
  session_key: string;
  flow_kind: string;
  revision: number;
  href: string;
  status: string;
  pinned?: boolean;
  paused?: boolean;
  step_key?: string | null;
};

type ResumeOut = {
  resume_mode?: string;
  href?: string;
  reason?: string | null;
  revision?: number;
};

export function JourneyContinuityPanel() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ContinueItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<{ items?: ContinueItem[] }>(
        "/api/v1/candidates/me/journey-continuity/continue",
        {},
        token,
      );
      setItems(data.items || []);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("journeyContinuity.error"));
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function onContinue(item: ContinueItem) {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setHint(null);
    try {
      const revKey = `twin_jrn_rev_${item.session_key}`;
      let clientRev: number | null = null;
      try {
        const raw = sessionStorage.getItem(revKey);
        if (raw) clientRev = Number(raw);
      } catch {
        clientRev = null;
      }
      const out = await apiFetch<ResumeOut>(
        `/api/v1/candidates/me/journey-continuity/sessions/${encodeURIComponent(item.session_key)}/resume`,
        {
          method: "POST",
          body: JSON.stringify({ client_revision: clientRev }),
        },
        token,
      );
      if (out.resume_mode === "EXACT_CHECKPOINT") {
        setHint(t("journeyContinuity.exact"));
        try {
          sessionStorage.setItem(revKey, String(out.revision ?? item.revision));
        } catch {
          /* cross-device uses server only — sessionStorage is tab hint */
        }
        window.location.assign(out.href || item.href);
        return;
      }
      if (out.resume_mode === "SAFE_REVIEW") {
        setHint(t("journeyContinuity.stale"));
        window.location.assign(out.href || item.href);
        return;
      }
      setHint(t("journeyContinuity.invalid"));
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("journeyContinuity.error"));
    } finally {
      setBusy(false);
    }
  }

  async function pin(item: ContinueItem, pinned: boolean) {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/candidates/me/journey-continuity/sessions/${encodeURIComponent(item.session_key)}/pin`,
        { method: "POST", body: JSON.stringify({ pinned }) },
        token,
      );
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("journeyContinuity.error"));
    } finally {
      setBusy(false);
    }
  }

  async function clearItem(item: ContinueItem) {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/candidates/me/journey-continuity/sessions/${encodeURIComponent(item.session_key)}/clear`,
        { method: "POST", body: "{}" },
        token,
      );
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("journeyContinuity.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card data-journey-continuity-panel className="mb-4">
      <h2 className="text-lg font-semibold">{t("journeyContinuity.title")}</h2>
      <p className="mt-1 text-sm text-[var(--twin-muted)]">{t("journeyContinuity.lead")}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--twin-muted)]">
        <li>{t("journeyContinuity.notFirstValue")}</li>
        <li>{t("journeyContinuity.noReminders")}</li>
      </ul>
      {err ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {err}
        </p>
      ) : null}
      {hint ? <p className="mt-2 text-sm">{hint}</p> : null}
      {(items || []).length === 0 ? (
        <p className="mt-3 text-sm text-[var(--twin-muted)]">{t("journeyContinuity.empty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.session_key}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--twin-border)] px-3 py-2 text-sm"
            >
              <span>
                {item.flow_kind}
                {item.step_key ? ` · ${item.step_key}` : ""}
                {item.pinned ? " · pin" : ""}
                {item.paused ? " · paused" : ""}
              </span>
              <span className="flex flex-wrap gap-2">
                <Button type="button" disabled={busy} onClick={() => void onContinue(item)}>
                  {t("journeyContinuity.continue")}
                </Button>
                <Button
                  type="button"
                  className="border border-[var(--twin-border)] bg-transparent"
                  disabled={busy}
                  onClick={() => void pin(item, !item.pinned)}
                >
                  {item.pinned ? t("journeyContinuity.unpin") : t("journeyContinuity.pin")}
                </Button>
                <Button
                  type="button"
                  className="border border-[var(--twin-border)] bg-transparent"
                  disabled={busy}
                  onClick={() => void clearItem(item)}
                >
                  {t("journeyContinuity.clear")}
                </Button>
                <Link className="twin-link inline-flex items-center" href={item.href}>
                  {t("journeyContinuity.review")}
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
