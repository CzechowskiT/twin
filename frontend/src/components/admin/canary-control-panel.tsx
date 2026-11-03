"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { getToken } from "@/lib/auth";
import { issueStepUpToken } from "@/lib/step-up";

type Designation = {
  status?: string;
  gate_ready?: boolean;
  gate_name?: string;
  active_count?: number;
  ambiguous?: boolean;
  designation_id?: string | null;
  delivery_identity_masked?: string | null;
  delivery_channel?: string | null;
  secure_roster_reference?: string | null;
  ladder?: {
    product_ready?: boolean;
    candidate_designated?: boolean;
    activation_executed?: boolean;
    invite_created?: boolean;
    canary_active?: boolean;
  };
};

type Snapshot = {
  state?: string;
  gate_ready?: boolean;
  activation_command?: string;
  real_invites_created?: number;
  real_candidates_bound?: number;
  never_auto_active?: boolean;
  active_one_candidate?: boolean;
  designation?: Designation;
  designation_gate_ready?: boolean;
  checklist?: { all_pass?: boolean };
};

type CanarySession = {
  authenticated?: boolean;
  csrf_token?: string;
  auth_method?: string;
  assurance_level?: string;
};

/**
 * Founder/ops canary control + real-candidate designation.
 * Save designation never mints/sends/activates or raises caps.
 */
export function CanaryControlPanel() {
  const { t } = useTranslation();
  const [session, setSession] = useState<CanarySession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [needsStepUp, setNeedsStepUp] = useState(false);
  const [password, setPassword] = useState("");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [des, setDes] = useState<Designation | null>(null);
  const [identity, setIdentity] = useState("");
  const [roster, setRoster] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const [cRes, dRes] = await Promise.all([
        fetch("/api/ops-admin/canary/control", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }),
        fetch("/api/ops-admin/canary/designation", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }),
      ]);
      const cBody = (await cRes.json().catch(() => ({}))) as Snapshot & { detail?: string };
      const dBody = (await dRes.json().catch(() => ({}))) as Designation & { detail?: string };
      if (!cRes.ok) {
        if (cRes.status === 401 || cRes.status === 403) setSession(null);
        setErr(t("canaryJourney.adminAccessError"));
        return;
      }
      setSnap(cBody);
      if (dRes.ok) setDes(dBody);
      else setDes((cBody.designation as Designation) || null);
    } catch {
      setErr(t("canaryJourney.adminAccessError"));
    }
  }, [t]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/ops-admin/canary/session", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as CanarySession;
        setSession(body);
        await refresh();
      } finally {
        setCheckingSession(false);
      }
    })();
  }, [refresh]);

  const openSession = async () => {
    const userToken = getToken();
    if (!userToken || busy) {
      setErr(t("canaryJourney.adminAccessError"));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      let stepUp: string | null = null;
      if (needsStepUp) {
        stepUp = await issueStepUpToken("FOUNDER_CANARY_ADMIN", password);
      }
      const response = await fetch("/api/ops-admin/canary/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          ...(stepUp ? { "X-Twin-Step-Up": stepUp } : {}),
        },
      });
      const body = (await response.json().catch(() => ({}))) as CanarySession & {
        detail?: string;
      };
      if (!response.ok) {
        if (body.detail === "step_up_required") setNeedsStepUp(true);
        setErr(t("canaryJourney.adminAccessError"));
        return;
      }
      setSession(body);
      setNeedsStepUp(false);
      setPassword("");
      await refresh();
    } catch {
      setErr(t("canaryJourney.adminAccessError"));
    } finally {
      setBusy(false);
      setCheckingSession(false);
    }
  };

  const closeSession = async () => {
    if (!session?.csrf_token || busy) return;
    setBusy(true);
    try {
      await fetch("/api/ops-admin/canary/session", {
        method: "DELETE",
        headers: { "X-CSRF-Token": session.csrf_token },
      });
      setSession(null);
      setSnap(null);
      setDes(null);
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: string) => {
    if (!session?.csrf_token || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ops-admin/canary/control", {
        method: "POST",
        headers: {
          "X-CSRF-Token": session.csrf_token,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json().catch(() => ({}))) as Snapshot & { detail?: string };
      if (!res.ok) {
        setErr(t("canaryJourney.adminAccessError"));
        return;
      }
      setSnap(body);
      if (body.designation) setDes(body.designation);
    } finally {
      setBusy(false);
    }
  };

  const saveDesignation = async () => {
    if (!session?.csrf_token || busy || !identity.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ops-admin/canary/designation", {
        method: "POST",
        headers: {
          "X-CSRF-Token": session.csrf_token,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          delivery_identity: identity.trim(),
          delivery_channel: "email",
          secure_roster_reference: roster.trim() || null,
          replace_existing: true,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as Designation & { detail?: string };
      if (!res.ok) {
        setErr(t("canaryJourney.adminAccessError"));
        return;
      }
      setDes(body);
      setIdentity("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const revokeDesignation = async () => {
    if (!session?.csrf_token || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ops-admin/canary/designation/revoke", {
        method: "POST",
        headers: {
          "X-CSRF-Token": session.csrf_token,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ designation_id: des?.designation_id || null }),
      });
      const body = (await res.json().catch(() => ({}))) as Designation & { detail?: string };
      if (!res.ok) {
        setErr(t("canaryJourney.adminAccessError"));
        return;
      }
      setDes(body);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const ladder = des?.ladder || {
    product_ready: true,
    candidate_designated: Boolean(des?.gate_ready),
    activation_executed: false,
    invite_created: false,
    canary_active: false,
  };

  return (
    <div className="space-y-6">
      <section
        data-testid="canary-founder-session"
        className="space-y-3 rounded border border-black/10 p-4"
      >
        <h2 className="text-lg font-medium">{t("canaryJourney.adminSessionTitle")}</h2>
        <p className="text-sm opacity-80">{t("canaryJourney.adminSessionLead")}</p>
        {session?.authenticated ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-emerald-700" role="status">
              {t("canaryJourney.adminSessionActive")}
              {session.auth_method === "mfa"
                ? ` · ${t("canaryJourney.adminSessionMfa")}`
                : ""}
            </p>
            <button
              type="button"
              className="twin-btn-secondary text-sm"
              disabled={busy}
              onClick={() => void closeSession()}
            >
              {t("canaryJourney.adminSessionLock")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm opacity-80">{t("canaryJourney.adminSessionLogin")}</p>
            {needsStepUp ? (
              <label className="block text-xs">
                {t("canaryJourney.adminSessionPassword")}
                <input
                  type="password"
                  className="mt-1 w-full border px-2 py-2 text-base"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </label>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="twin-btn-solid text-sm"
                disabled={busy || checkingSession || (needsStepUp && !password)}
                onClick={() => void openSession()}
              >
                {t("canaryJourney.adminSessionUnlock")}
              </button>
              <Link
                className="twin-btn-secondary text-sm"
                href="/login/candidate?next=/admin/canary"
              >
                {t("login.submit")}
              </Link>
            </div>
          </div>
        )}
      </section>

      <section data-testid="canary-control-panel" className="space-y-3 rounded border border-black/10 p-4">
        <h2 className="text-lg font-medium">{t("canaryJourney.adminTitle")}</h2>
        <p className="text-sm opacity-80">{t("canaryJourney.adminLead")}</p>
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
              disabled={busy || !session?.authenticated}
              onClick={() => void act(action)}
            >
              {t(`canaryJourney.${key}`)}
            </button>
          ))}
        </div>
      </section>

      <section
        data-testid="canary-designation-panel"
        className="space-y-3 rounded border border-black/10 p-4"
      >
        <h2 className="text-lg font-medium">{t("canaryJourney.desTitle")}</h2>
        <p className="text-sm opacity-80">{t("canaryJourney.desLead")}</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>
            {t("canaryJourney.ladderProduct")}:{" "}
            <strong>{String(Boolean(ladder.product_ready))}</strong>
          </li>
          <li>
            {t("canaryJourney.ladderDesignated")}:{" "}
            <strong>{String(Boolean(ladder.candidate_designated))}</strong>
          </li>
          <li>
            {t("canaryJourney.ladderActivation")}:{" "}
            <strong>{String(!ladder.activation_executed)}</strong>
          </li>
          <li>
            {t("canaryJourney.ladderInvite")}: <strong>{String(!ladder.invite_created)}</strong>
          </li>
          <li>
            {t("canaryJourney.ladderInactive")}: <strong>{String(!ladder.canary_active)}</strong>
          </li>
        </ol>
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div>
            {t("canaryJourney.desStatus")}: <strong>{des?.status || "NOT_DESIGNATED"}</strong>
          </div>
          <div>
            {t("canaryJourney.desGate")}:{" "}
            <strong>{des?.gate_ready ? "true" : "false"}</strong>
          </div>
          <div className="sm:col-span-2">
            {t("canaryJourney.desMasked")}:{" "}
            <strong>{des?.delivery_identity_masked || "—"}</strong>
          </div>
        </dl>
        <label className="block text-xs">
          {t("canaryJourney.desIdentity")}
          <input
            type="email"
            className="mt-1 w-full border px-2 py-1 text-sm"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            autoComplete="off"
            data-testid="canary-designation-identity"
          />
        </label>
        <label className="block text-xs">
          {t("canaryJourney.desRoster")}
          <input
            type="text"
            className="mt-1 w-full border px-2 py-1 text-sm"
            value={roster}
            onChange={(e) => setRoster(e.target.value)}
            autoComplete="off"
          />
        </label>
        <p className="text-xs opacity-60">{t("canaryJourney.desReplaceHint")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="twin-btn-solid text-sm"
            disabled={busy || !session?.authenticated || !identity.trim()}
            onClick={() => void saveDesignation()}
            data-testid="canary-designation-save"
          >
            {t("canaryJourney.desSave")}
          </button>
          <button
            type="button"
            className="twin-btn-secondary text-sm"
            disabled={busy || !session?.authenticated || des?.status !== "DESIGNATED_READY"}
            onClick={() => void revokeDesignation()}
            data-testid="canary-designation-revoke"
          >
            {t("canaryJourney.desRevoke")}
          </button>
        </div>
      </section>
    </div>
  );
}
