"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";

type Snapshot = {
  state?: string;
  gate_ready?: boolean;
  activation_command?: string;
  real_invites_created?: number;
  real_candidates_bound?: number;
  never_auto_active?: boolean;
  active_one_candidate?: boolean;
  checklist?: { all_pass?: boolean };
};

const STORAGE_KEY = "twin_ops_admin_token";

/**
 * Epic 2.14 — Founder/ops canary control plane (admin, not org portal).
 * Actions prepare/evaluate/pause only — never mints or activates a real invite.
 */
export function CanaryControlPanel() {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setToken(sessionStorage.getItem(STORAGE_KEY) || "");
    } catch {
      /* ignore */
    }
  }, []);

  const refresh = useCallback(async (tok: string) => {
    if (!tok.trim()) return;
    setErr(null);
    try {
      const res = await fetch("/api/ops-admin/canary/control", {
        headers: { Authorization: `Bearer ${tok.trim()}`, Accept: "application/json" },
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as Snapshot & { detail?: string };
      if (!res.ok) {
        setErr(typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`);
        return;
      }
      setSnap(body);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "fetch_failed");
    }
  }, []);

  useEffect(() => {
    if (token) void refresh(token);
  }, [token, refresh]);

  const act = async (action: string) => {
    if (!token.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ops-admin/canary/control", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json().catch(() => ({}))) as Snapshot & { detail?: string };
      if (!res.ok) {
        setErr(typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`);
        return;
      }
      setSnap(body);
    } finally {
      setBusy(false);
    }
  };

  const saveToken = (value: string) => {
    setToken(value);
    try {
      sessionStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  };

  return (
    <section data-testid="canary-control-panel" className="space-y-3 rounded border border-black/10 p-4">
      <h2 className="text-lg font-medium">{t("canaryJourney.adminTitle")}</h2>
      <p className="text-sm opacity-80">{t("canaryJourney.adminLead")}</p>
      <label className="block text-xs">
        Ops token
        <input
          type="password"
          className="mt-1 w-full border px-2 py-1 text-sm"
          value={token}
          onChange={(e) => saveToken(e.target.value)}
          autoComplete="off"
        />
      </label>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      {snap ? (
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div>
            {t("canaryJourney.adminState")}: <strong>{snap.state || "—"}</strong>
          </div>
          <div>
            {t("canaryJourney.adminGate")}:{" "}
            <strong>{snap.gate_ready ? "true" : "false"}</strong>
          </div>
          <div>
            {t("canaryJourney.adminActivation")}:{" "}
            <strong>{snap.activation_command || "PREPARED_NOT_EXECUTED"}</strong>
          </div>
          <div>
            {t("canaryJourney.adminRealInvites")}:{" "}
            <strong>{snap.real_invites_created ?? 0}</strong>
          </div>
          <div className="sm:col-span-2">
            {t("canaryJourney.adminNeverAuto")}:{" "}
            <strong>{snap.never_auto_active !== false ? "true" : "false"}</strong>
            {" · "}
            ACTIVE={String(Boolean(snap.active_one_candidate))}
          </div>
        </dl>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["prepare", "adminPrepare"],
            ["create_invite_dry_run", "adminDryRun"],
            ["evaluate_gate", "adminEvaluate"],
            ["pause", "adminPause"],
            ["resume", "adminResume"],
            ["export_evidence", "adminExport"],
            ["abort", "adminAbort"],
            ["close", "adminClose"],
          ] as const
        ).map(([action, key]) => (
          <button
            key={action}
            type="button"
            className="twin-btn-secondary text-sm"
            disabled={busy || !token.trim()}
            onClick={() => void act(action)}
          >
            {t(`canaryJourney.${key}`)}
          </button>
        ))}
      </div>
    </section>
  );
}
