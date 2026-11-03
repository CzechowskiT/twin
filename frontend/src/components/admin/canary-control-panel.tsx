"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useTranslation } from "@/components/language-provider";
import { getToken, hasActiveSession } from "@/lib/auth";
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

type AuthGate = "checking" | "need_login" | "forbidden" | "need_elevate" | "ready";

const LOGIN_NEXT = "/login?next=%2Fadmin%2Fcanary";
const SESSION_API = "/api/ops-admin/canary/session";
const CSRF_COOKIE = "twin_founder_canary_csrf";

function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() !== CSRF_COOKIE) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return part.slice(idx + 1).trim();
    }
  }
  return "";
}

/**
 * Founder canary control + real-candidate designation.
 * Auth: Founder allowlist + elevated HttpOnly cookie session (step-up/MFA).
 * Never stores OPS_ADMIN_TOKEN in browser storage.
 * Save designation never mints/sends/activates or raises caps.
 */
export function CanaryControlPanel() {
  const { t } = useTranslation();
  const router = useRouter();
  const [authGate, setAuthGate] = useState<AuthGate>("checking");
  const [csrf, setCsrf] = useState<string>("");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [des, setDes] = useState<Designation | null>(null);
  const [identity, setIdentity] = useState("");
  const [roster, setRoster] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canaryHeaders = useCallback(
    (extra?: Record<string, string>): HeadersInit => {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(extra || {}),
      };
      const csrfToken = csrf || readCsrfCookie();
      if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
      const token = getToken()?.trim();
      // Optional bearer for first elevate / status before cookies exist — never OPS token.
      if (token) headers.Authorization = `Bearer ${token}`;
      return headers;
    },
    [csrf],
  );

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const [cRes, dRes] = await Promise.all([
        fetch("/api/ops-admin/canary/control", {
          headers: canaryHeaders(),
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch("/api/ops-admin/canary/designation", {
          headers: canaryHeaders(),
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);
      const cBody = (await cRes.json().catch(() => ({}))) as Snapshot & { detail?: string };
      const dBody = (await dRes.json().catch(() => ({}))) as Designation & { detail?: string };
      if (cRes.status === 401) {
        setAuthGate("need_login");
        return;
      }
      if (cRes.status === 403) {
        setAuthGate("forbidden");
        setErr(typeof cBody.detail === "string" ? cBody.detail : null);
        return;
      }
      if (!cRes.ok) {
        setErr(typeof cBody.detail === "string" ? cBody.detail : `HTTP ${cRes.status}`);
        return;
      }
      setSnap(cBody);
      if (dRes.ok) setDes(dBody);
      else setDes((cBody.designation as Designation) || null);
      setAuthGate("ready");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "fetch_failed");
    }
  }, [canaryHeaders]);

  useEffect(() => {
    let cancelled = false;
    async function gate() {
      if (!hasActiveSession()) {
        if (!cancelled) setAuthGate("need_login");
        router.replace(LOGIN_NEXT);
        return;
      }
      try {
        const res = await fetch(SESSION_API, {
          headers: canaryHeaders(),
          credentials: "same-origin",
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as {
          founder?: boolean;
          elevated?: boolean;
          detail?: string;
        };
        if (cancelled) return;
        if (res.status === 401 || !hasActiveSession()) {
          setAuthGate("need_login");
          router.replace(LOGIN_NEXT);
          return;
        }
        if (body.founder === false) {
          setAuthGate("forbidden");
          return;
        }
        if (!body.elevated) {
          setAuthGate("need_elevate");
          return;
        }
        const fromCookie = readCsrfCookie();
        if (fromCookie) setCsrf(fromCookie);
        setAuthGate("ready");
        await refresh();
      } catch {
        if (!cancelled) {
          setErr("session_check_failed");
          setAuthGate("need_elevate");
        }
      }
    }
    void gate();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount — refresh/canaryHeaders stable enough for gate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const elevate = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      const token = getToken()?.trim();
      if (!token) {
        setAuthGate("need_login");
        router.replace(LOGIN_NEXT);
        return;
      }
      headers.Authorization = `Bearer ${token}`;
      if (mfaCode.trim()) {
        headers["X-Twin-Mfa-Code"] = mfaCode.trim();
      } else if (password.trim()) {
        const step = await issueStepUpToken("CANARY_ADMIN_MUTATE", password.trim());
        headers["X-Twin-Step-Up"] = step;
      } else {
        setErr("step_up_or_mfa_required");
        return;
      }
      const res = await fetch(SESSION_API, {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: "{}",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as {
        csrf_token?: string;
        detail?: string;
        elevated?: boolean;
      };
      if (!res.ok) {
        setErr(typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`);
        return;
      }
      if (body.csrf_token) setCsrf(body.csrf_token);
      setPassword("");
      setMfaCode("");
      setAuthGate("ready");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "elevate_failed");
    } finally {
      setBusy(false);
    }
  };

  const lockSession = async () => {
    setBusy(true);
    try {
      await fetch(SESSION_API, {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
      });
    } finally {
      setCsrf("");
      setSnap(null);
      setDes(null);
      setAuthGate("need_elevate");
      setBusy(false);
    }
  };

  const act = async (action: string) => {
    if (busy || authGate !== "ready") return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ops-admin/canary/control", {
        method: "POST",
        headers: canaryHeaders({ "Content-Type": "application/json" }),
        credentials: "same-origin",
        body: JSON.stringify({ action }),
      });
      const body = (await res.json().catch(() => ({}))) as Snapshot & { detail?: string };
      if (res.status === 403 && String(body.detail || "").includes("elevated")) {
        setAuthGate("need_elevate");
        return;
      }
      if (!res.ok) {
        setErr(typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`);
        return;
      }
      setSnap(body);
      if (body.designation) setDes(body.designation);
    } finally {
      setBusy(false);
    }
  };

  const saveDesignation = async () => {
    if (busy || authGate !== "ready" || !identity.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ops-admin/canary/designation", {
        method: "POST",
        headers: canaryHeaders({ "Content-Type": "application/json" }),
        credentials: "same-origin",
        body: JSON.stringify({
          delivery_identity: identity.trim(),
          delivery_channel: "email",
          secure_roster_reference: roster.trim() || null,
          replace_existing: true,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as Designation & { detail?: string };
      if (!res.ok) {
        setErr(typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`);
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
    if (busy || authGate !== "ready") return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ops-admin/canary/designation/revoke", {
        method: "POST",
        headers: canaryHeaders({ "Content-Type": "application/json" }),
        credentials: "same-origin",
        body: JSON.stringify({ designation_id: des?.designation_id || null }),
      });
      const body = (await res.json().catch(() => ({}))) as Designation & { detail?: string };
      if (!res.ok) {
        setErr(typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`);
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

  if (authGate === "checking" || authGate === "need_login") {
    return (
      <div data-testid="canary-control-panel" className="space-y-3 rounded border border-black/10 p-4">
        <p className="text-sm opacity-80">{t("canaryJourney.authChecking")}</p>
      </div>
    );
  }

  if (authGate === "forbidden") {
    return (
      <div data-testid="canary-control-panel" className="space-y-3 rounded border border-black/10 p-4">
        <h2 className="text-lg font-medium">{t("canaryJourney.adminTitle")}</h2>
        <p className="text-sm text-red-700">{t("canaryJourney.authForbidden")}</p>
      </div>
    );
  }

  if (authGate === "need_elevate") {
    return (
      <div data-testid="canary-control-panel" className="space-y-3 rounded border border-black/10 p-4">
        <h2 className="text-lg font-medium">{t("canaryJourney.adminTitle")}</h2>
        <p className="text-sm opacity-80">{t("canaryJourney.authElevateLead")}</p>
        {err ? <p className="text-sm text-red-700">{err}</p> : null}
        <label className="block text-xs">
          {t("canaryJourney.authPassword")}
          <input
            type="password"
            className="mt-1 w-full border px-2 py-2 text-sm sm:py-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            data-testid="canary-elevate-password"
          />
        </label>
        <label className="block text-xs">
          {t("canaryJourney.authMfaCode")}
          <input
            type="text"
            inputMode="numeric"
            className="mt-1 w-full border px-2 py-2 text-sm sm:py-1"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            autoComplete="one-time-code"
            data-testid="canary-elevate-mfa"
          />
        </label>
        <button
          type="button"
          className="twin-btn-solid text-sm"
          disabled={busy || (!password.trim() && !mfaCode.trim())}
          onClick={() => void elevate()}
          data-testid="canary-elevate-submit"
        >
          {t("canaryJourney.authUnlock")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section data-testid="canary-control-panel" className="space-y-3 rounded border border-black/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-medium">{t("canaryJourney.adminTitle")}</h2>
            <p className="text-sm opacity-80">{t("canaryJourney.adminLead")}</p>
            <p className="mt-1 text-xs opacity-60" data-testid="canary-elevated-badge">
              {t("canaryJourney.authElevated")}
            </p>
          </div>
          <button
            type="button"
            className="twin-btn-secondary text-sm"
            disabled={busy}
            onClick={() => void lockSession()}
            data-testid="canary-lock-session"
          >
            {t("canaryJourney.authLock")}
          </button>
        </div>
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
              disabled={busy}
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
            className="mt-1 w-full border px-2 py-2 text-sm sm:py-1"
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
            className="mt-1 w-full border px-2 py-2 text-sm sm:py-1"
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
            disabled={busy || !identity.trim()}
            onClick={() => void saveDesignation()}
            data-testid="canary-designation-save"
          >
            {t("canaryJourney.desSave")}
          </button>
          <button
            type="button"
            className="twin-btn-secondary text-sm"
            disabled={busy || des?.status !== "DESIGNATED_READY"}
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
