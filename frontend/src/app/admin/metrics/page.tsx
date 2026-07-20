"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "twin_ops_admin_token";

type FunnelConversion = {
  signup_to_onboarding_pct?: number;
  onboarding_to_first_match_pct?: number;
  first_match_to_first_application_pct?: number;
  onboarding_to_calendar_pct?: number;
  onboarding_to_interview_pct?: number;
};

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
  north_star_name?: string;
  north_star_value_7d?: number;
  funnel_conversion?: FunnelConversion;
  funnel_instrumentation_enabled?: boolean;
  generated_at: string;
};

type FunnelSnapshot = {
  north_star?: { name?: string; value_7d?: number; definition?: string };
  conversion?: FunnelConversion;
  event_counts_window?: Record<string, number>;
  instrumentation_enabled?: boolean;
};

type RetentionPayload = {
  cohorts?: Array<{
    signup_week: string;
    signups: number;
    onboarded_pct: number;
    d7_retention_pct: number;
    d30_retention_pct: number;
    first_match_pct: number;
  }>;
};

export default function AdminMetricsPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<AdminMetrics | null>(null);
  const [funnel, setFunnel] = useState<FunnelSnapshot | null>(null);
  const [retention, setRetention] = useState<RetentionPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) queueMicrotask(() => setToken(s));
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
      const headers = { Authorization: `Bearer ${t}` };
      const [metricsRes, funnelRes, retentionRes] = await Promise.all([
        fetch("/api/ops-admin/metrics", { headers, cache: "no-store" }),
        fetch("/api/ops-admin/funnel?days=30", { headers, cache: "no-store" }),
        fetch("/api/ops-admin/retention?weeks=8", { headers, cache: "no-store" }),
      ]);
      if (!metricsRes.ok) throw new Error(await metricsRes.text());
      setData((await metricsRes.json()) as AdminMetrics);
      if (funnelRes.ok) setFunnel((await funnelRes.json()) as FunnelSnapshot);
      else setFunnel(null);
      if (retentionRes.ok) setRetention((await retentionRes.json()) as RetentionPayload);
      else setRetention(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setData(null);
      setFunnel(null);
      setRetention(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const maxHist = data
    ? Math.max(1, ...Object.values(data.feedback_rating_histogram).map((n) => Number(n)))
    : 1;

  const conv = data?.funnel_conversion || funnel?.conversion;

  return (
    <main className="twin-shell twin-shell--wide py-10">
      <h1 className="mb-2 text-2xl font-semibold">Product metrics</h1>
      <p className="twin-muted mb-2 text-sm">
        North star + funnel KPIs. Server-side events are source of truth when instrumentation is enabled.
      </p>
      <p className="mb-6 text-sm">
        <Link href="/admin/cohorts" className="underline">
          Activation cohorts →
        </Link>
      </p>
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
            <Stat
              label="North star (7d)"
              value={String(data.north_star_value_7d ?? funnel?.north_star?.value_7d ?? 0)}
            />
            <Stat label="Users" value={String(data.users_total)} />
            <Stat label="Signups (7d)" value={String(data.signups_last_7_days)} />
            <Stat
              label="Onboarding done"
              value={`${data.onboarding_completed} (${data.onboarding_completion_pct}%)`}
            />
            <Stat label="Matches" value={String(data.matches_total)} />
            <Stat label="Applications" value={String(data.applications_total)} />
            <Stat label="Disputed placements" value={String(data.disputed_placements)} />
            <Stat
              label="Funnel on"
              value={data.funnel_instrumentation_enabled === false ? "OFF" : "ON"}
            />
          </div>

          {conv ? (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Funnel conversion</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Stat label="Signup → onboarding" value={`${conv.signup_to_onboarding_pct ?? 0}%`} />
                <Stat
                  label="Onboarding → first match"
                  value={`${conv.onboarding_to_first_match_pct ?? 0}%`}
                />
                <Stat
                  label="Match → first application"
                  value={`${conv.first_match_to_first_application_pct ?? 0}%`}
                />
                <Stat label="Onboarding → calendar" value={`${conv.onboarding_to_calendar_pct ?? 0}%`} />
                <Stat
                  label="Onboarding → interview"
                  value={`${conv.onboarding_to_interview_pct ?? 0}%`}
                />
              </div>
            </section>
          ) : null}

          {retention?.cohorts && retention.cohorts.length > 0 ? (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Signup-week cohorts</h2>
              <div className="overflow-x-auto text-sm">
                <table className="w-full min-w-[32rem] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--twin-border)] text-left">
                      <th className="py-2 pr-3">Week</th>
                      <th className="py-2 pr-3">Signups</th>
                      <th className="py-2 pr-3">Onboarded</th>
                      <th className="py-2 pr-3">D7</th>
                      <th className="py-2 pr-3">D30</th>
                      <th className="py-2">1st match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retention.cohorts.slice(0, 8).map((c) => (
                      <tr key={c.signup_week} className="border-b border-[var(--twin-border)]">
                        <td className="py-2 pr-3 font-mono">{c.signup_week}</td>
                        <td className="py-2 pr-3 tabular-nums">{c.signups}</td>
                        <td className="py-2 pr-3 tabular-nums">{c.onboarded_pct}%</td>
                        <td className="py-2 pr-3 tabular-nums">{c.d7_retention_pct}%</td>
                        <td className="py-2 pr-3 tabular-nums">{c.d30_retention_pct}%</td>
                        <td className="py-2 tabular-nums">{c.first_match_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

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
