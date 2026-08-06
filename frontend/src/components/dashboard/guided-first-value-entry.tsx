"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type GuidedState = {
  state?: string;
  entry_choice?: string | null;
  starter_path?: string | null;
  demo_first_value_seen?: boolean;
  real_first_value_reached?: boolean;
};

const STARTERS = [
  { path: "direction", href: "/dashboard/career", labelKey: "guidedFv.pathDirection" as const },
  { path: "first_evidence", href: "/dashboard/portfolio", labelKey: "guidedFv.pathEvidence" as const },
  {
    path: "opportunity_review",
    href: "/dashboard/matches",
    labelKey: "guidedFv.pathOpportunities" as const,
  },
  {
    path: "organize_current_actions",
    href: "/dashboard/execution-calendar",
    labelKey: "guidedFv.pathOrganize" as const,
  },
] as const;

/** Guided First Value entry — skippable/pausable; no guilt/scores. */
export function GuidedFirstValueEntry() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<GuidedState | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoActive, setDemoActive] = useState(false);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [g, d] = await Promise.all([
        apiFetch("/api/v1/candidates/me/guided-first-value", {}, token),
        apiFetch("/api/v1/candidates/me/isolated-demo", {}, token),
      ]);
      setStatus((g as GuidedState) || null);
      setDemoActive(Boolean((d as { active?: boolean })?.active));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const post = async (path: string, body?: Record<string, unknown>) => {
    const token = getToken();
    if (!token || busy) return;
    setBusy(true);
    try {
      await apiFetch(
        path,
        { method: "POST", body: JSON.stringify(body || {}) },
        token
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const choose = async (choice: string) => {
    await post("/api/v1/candidates/me/guided-first-value/entry", { choice });
    if (choice === "EXPLORE_SAFE_DEMO") {
      await post("/api/v1/candidates/me/isolated-demo/start");
      await post("/api/v1/candidates/me/guided-first-value/demo-first-value-seen");
    }
  };

  const exitDemo = async () => {
    await post("/api/v1/candidates/me/isolated-demo/exit");
    await post("/api/v1/candidates/me/guided-first-value/entry", {
      choice: "START_WITH_MY_DATA",
    });
  };

  if (status?.state === "SKIPPED" || status?.state === "COMPLETED") {
    return null;
  }

  return (
    <Card data-guided-first-value>
      {demoActive ? (
        <div
          className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm"
          role="status"
        >
          <p className="font-medium">{t("guidedFv.demoBanner")}</p>
          <button type="button" className="twin-link mt-1 text-sm" onClick={() => void exitDemo()} disabled={busy}>
            {t("guidedFv.demoExit")}
          </button>
        </div>
      ) : null}

      <h2 className="text-lg font-medium">{t("guidedFv.entryTitle")}</h2>
      <p className="mt-1 text-sm opacity-80">{t("guidedFv.entryLead")}</p>

      {status?.state === "PAUSED" ? (
        <button
          type="button"
          className="twin-btn-solid mt-3 text-sm"
          disabled={busy}
          onClick={() => void post("/api/v1/candidates/me/guided-first-value/resume")}
        >
          {t("guidedFv.resume")}
        </button>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            className="twin-btn-secondary text-left text-sm"
            disabled={busy}
            onClick={() => void choose("EXPLORE_SAFE_DEMO")}
          >
            <span className="font-medium">{t("guidedFv.exploreDemo")}</span>
            <span className="mt-1 block text-xs opacity-70">{t("guidedFv.exploreDemoHint")}</span>
          </button>
          <button
            type="button"
            className="twin-btn-secondary text-left text-sm"
            disabled={busy}
            onClick={() => void choose("START_WITH_MY_DATA")}
          >
            <span className="font-medium">{t("guidedFv.startMyData")}</span>
            <span className="mt-1 block text-xs opacity-70">{t("guidedFv.startMyDataHint")}</span>
          </button>
          <button
            type="button"
            className="twin-btn-secondary text-left text-sm"
            disabled={busy}
            onClick={() => void choose("RESUME_EXISTING_SETUP")}
          >
            <span className="font-medium">{t("guidedFv.resumeSetup")}</span>
            <span className="mt-1 block text-xs opacity-70">{t("guidedFv.resumeSetupHint")}</span>
          </button>
        </div>
      )}

      {status?.entry_choice && status.state !== "PAUSED" ? (
        <div className="mt-4">
          <p className="text-sm font-medium">{t("guidedFv.starterTitle")}</p>
          <nav className="mt-2 flex flex-wrap gap-2 text-sm" aria-label={t("guidedFv.starterTitle")}>
            {STARTERS.map((s) => (
              <Link
                key={s.path}
                href={s.href}
                className="twin-link"
                onClick={() =>
                  void post("/api/v1/candidates/me/guided-first-value/starter-path", { path: s.path })
                }
              >
                {t(s.labelKey)}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {status?.state === "IN_PROGRESS" ? (
          <button
            type="button"
            className="twin-btn-ghost text-sm"
            disabled={busy}
            onClick={() => void post("/api/v1/candidates/me/guided-first-value/pause")}
          >
            {t("guidedFv.pause")}
          </button>
        ) : null}
        <button
          type="button"
          className="twin-btn-ghost text-sm"
          disabled={busy}
          onClick={() => void post("/api/v1/candidates/me/guided-first-value/skip")}
        >
          {t("guidedFv.skip")}
        </button>
      </div>
      <p className="mt-2 text-xs opacity-60">{t("guidedFv.claimKind")}</p>
    </Card>
  );
}
