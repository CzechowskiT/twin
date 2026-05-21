"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "twin_ops_admin_token";

type AdminMetrics = {
  users_total: number;
  signups_last_7_days: number;
  onboarding_completed: number;
  onboarding_completion_pct: number;
  matches_total: number;
  applications_total: number;
  disputed_placements: number;
  feedback_count: number;
  feedback_avg_rating: number | null;
  feedback_rating_histogram: Record<string, number>;
  generated_at: string;
};

export default function AdminMetricsPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<AdminMetrics | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) setToken(s);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const t = token.trim();
    if (!t) {
      setErr("Paste ops admin token first.");
      setLoading(false);
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    try {
      const res = await fetch("/api/ops-admin/metrics", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      setData((await res.json()) as AdminMetrics);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const maxHist = data
    ? Math.max(1, ...Object.values(data.feedback_rating_histogram).map((n) => Number(n)))
    : 1;

  return (
    <main className="twin-shell twin-shell--wide py-10">
      <h1 className="mb-2 text-2xl font-semibold">Product metrics</h1>
      <p className="twin-muted mb-6 text-sm">Headline KPIs for Quantica-style ops review.</p>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end">
        <input
          className="twin-input min-w-0 flex-1"
          type="password"
          placeholder="OPS / BETA admin token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button type="button" className="twin-btn-solid" disabled={loading} onClick={() => void load()}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Users" value={String(data.users_total)} />
            <Stat label="Signups (7d)" value={String(data.signups_last_7_days)} />
            <Stat label="Onboarding done" value={`${data.onboarding_completed} (${data.onboarding_completion_pct}%)`} />
            <Stat label="Matches" value={String(data.matches_total)} />
            <Stat label="Applications" value={String(data.applications_total)} />
            <Stat label="Disputed placements" value={String(data.disputed_placements)} />
            <Stat label="Feedback" value={String(data.feedback_count)} />
            <Stat
              label="Avg rating"
              value={data.feedback_avg_rating != null ? String(data.feedback_avg_rating) : "—"}
            />
          </div>
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Rating distribution</h2>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const count = data.feedback_rating_histogram[String(star)] ?? 0;
                const pct = Math.round((100 * count) / maxHist);
                return (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-8">{star}★</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--twin-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--twin-accent)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </section>
          <p className="twin-muted mt-6 text-xs">Generated {data.generated_at}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href="/admin/placements" className="twin-link">
              Placement disputes →
            </Link>
            <Link href="/admin/partner-keys" className="twin-link">
              Partner API keys →
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface)] p-4">
      <p className="twin-muted text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
