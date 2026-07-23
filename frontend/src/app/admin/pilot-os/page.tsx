"use client";

/**
 * Founder / ops Pilot OS console — real data only via ops Bearer.
 * No synthetic KPIs as production truth.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "twin_ops_admin_token";

type FirstCustomer = {
  first_customer_verdict?: string;
  pilot_health_score?: number;
  launch_go_readiness_score?: number;
  launch_decision?: string;
  kpi_token?: string;
  open_support_tickets?: number;
  open_feedback_items?: number;
};

type OsStatus = {
  verdict?: string;
  kpi_token?: string;
  canonical_url?: string;
  next_founder_action?: string;
  first_customer?: FirstCustomer;
  stance?: Record<string, string | boolean>;
  founder_approved_real_orgs?: unknown[];
  support_open_tickets?: number;
  launch_go_gate?: { launch_decision?: string; reason?: string; counts?: Record<string, number> };
};

export default function AdminPilotOsPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<OsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setToken(sessionStorage.getItem(STORAGE_KEY) || "");
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    if (!token.trim()) {
      setError("Paste ops admin token (stored only in sessionStorage).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      sessionStorage.setItem(STORAGE_KEY, token.trim());
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://twin-production-bcd9.up.railway.app"}/api/v1/admin/pilot-os/status`,
        { headers: { Authorization: `Bearer ${token.trim()}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as OsStatus;
      setStatus(body);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setBusy(false);
    }
  }, [token]);

  const fc = status?.first_customer;
  const approved = status?.founder_approved_real_orgs?.length ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-neutral-500">
        <Link href="/admin/metrics">← Metrics</Link> ·{" "}
        <Link href="/admin/cohorts">Cohorts</Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Pilot OS — first customer</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Real ops data only. Launch stays NO-GO. KPI stays honest until a Founder-approved real org.
      </p>

      <label className="mt-6 block text-sm font-medium">Ops Bearer token</label>
      <input
        className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        type="password"
        autoComplete="off"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="OPS_ADMIN_TOKEN"
      />
      <button
        type="button"
        className="mt-3 rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        disabled={busy}
        onClick={() => void load()}
      >
        {busy ? "Loading…" : "Refresh status"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {status ? (
        <section className="mt-8 space-y-4 text-sm">
          <div className="rounded border border-neutral-200 p-4">
            <h2 className="font-medium">Verdict</h2>
            <p className="mt-1">{status.verdict || fc?.first_customer_verdict}</p>
            <p className="mt-2 text-neutral-600">Next: {status.next_founder_action}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-neutral-500">Pilot health</p>
              <p className="text-2xl font-semibold">{fc?.pilot_health_score ?? "—"}</p>
            </div>
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-neutral-500">Launch GO readiness</p>
              <p className="text-2xl font-semibold">{fc?.launch_go_readiness_score ?? 0}</p>
              <p className="text-xs text-neutral-500">Decision: {fc?.launch_decision || "NO-GO"}</p>
            </div>
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-neutral-500">KPI</p>
              <p className="font-medium">{status.kpi_token || fc?.kpi_token}</p>
            </div>
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-neutral-500">Approved real orgs</p>
              <p className="text-2xl font-semibold">{approved}</p>
            </div>
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-neutral-500">Open support</p>
              <p className="text-2xl font-semibold">
                {status.support_open_tickets ?? fc?.open_support_tickets ?? 0}
              </p>
            </div>
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-neutral-500">Open feedback</p>
              <p className="text-2xl font-semibold">{fc?.open_feedback_items ?? 0}</p>
            </div>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <h2 className="font-medium">Stance (frozen)</h2>
            <ul className="mt-2 list-inside list-disc text-neutral-700">
              <li>Pilot: {String(status.stance?.pilot)}</li>
              <li>Launch: {String(status.stance?.launch)}</li>
              <li>Enrollment: {String(status.stance?.enrollment)}</li>
              <li>Phase 3B: {String(status.stance?.phase_3b)}</li>
              <li>Gate F: {String(status.stance?.gate_f)}</li>
            </ul>
            <p className="mt-2 text-neutral-600">
              Canonical: {status.canonical_url || "https://twin-sooty.vercel.app"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Launch GO gate: {status.launch_go_gate?.reason || "—"}
            </p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
