"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "twin_beta_admin_token";

export type BetaAdminStats = {
  total_signups: number;
  cap: number;
  spots_left: number;
  linkedin_shared: number;
  cv_uploaded: number;
  voice_recorded: number;
  by_source: Record<string, number>;
  referral_rows: number;
  top_referrers: { referrer_code: string; referrals: number }[];
};

export default function BetaAdminPage() {
  const [token, setToken] = useState("");
  const [stats, setStats] = useState<BetaAdminStats | null>(null);
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

  const saveToken = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, token.trim());
    } catch {
      /* ignore */
    }
  }, [token]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    saveToken();
    const t = token.trim();
    if (!t) {
      setErr("Paste the admin token first.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/beta-admin/stats", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      const text = await res.text();
      if (!res.ok) {
        setStats(null);
        setErr(text || res.statusText);
        return;
      }
      setStats(JSON.parse(text) as BetaAdminStats);
    } catch (e: unknown) {
      setStats(null);
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [token, saveToken]);

  const viral = useMemo(() => {
    if (!stats || stats.total_signups <= 0) return null;
    return stats.referral_rows / stats.total_signups;
  }, [stats]);

  const funnel = useMemo(() => {
    if (!stats || stats.total_signups <= 0) return null;
    const n = stats.total_signups;
    return {
      linkedin_pct: (100 * stats.linkedin_shared) / n,
      cv_pct: (100 * stats.cv_uploaded) / n,
      voice_pct: (100 * stats.voice_recorded) / n,
    };
  }, [stats]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#004E89]">Beta waitlist — admin</h1>
      <p className="mt-2 text-sm text-slate-600">
        Uses the same <code className="rounded bg-slate-100 px-1">BETA_ADMIN_TOKEN</code> as the API. Token stays in
        session storage on this device only.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-800">
          Admin token
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm shadow-sm"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Bearer value from BETA_ADMIN_TOKEN"
          />
        </label>
        <button
          type="button"
          className="rounded-lg bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white shadow hover:opacity-95 disabled:opacity-50"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? "Loading…" : "Load stats"}
        </button>
      </div>

      {err ? (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-red-50 p-3 text-xs text-red-800">{err}</pre>
      ) : null}

      {stats ? (
        <div className="mt-8 space-y-8">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total signups" value={stats.total_signups} accent="blue" />
            <StatCard label="Cap" value={stats.cap} accent="slate" />
            <StatCard label="Spots left" value={stats.spots_left} accent="orange" />
            <StatCard label="Referral rows" value={stats.referral_rows} accent="green" />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Viral & funnel</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>
                <strong>Viral coefficient (proxy):</strong>{" "}
                {viral === null ? "—" : viral.toFixed(2)} referral rows ÷ signups
              </li>
              {funnel ? (
                <>
                  <li>LinkedIn share flag: {funnel.linkedin_pct.toFixed(1)}%</li>
                  <li>CV uploaded: {funnel.cv_pct.toFixed(1)}%</li>
                  <li>Voice recorded: {funnel.voice_pct.toFixed(1)}%</li>
                </>
              ) : null}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Signups by source</h2>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {Object.entries(stats.by_source)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <li key={k} className="flex justify-between py-2">
                    <span className="font-mono text-slate-800">{k}</span>
                    <span className="font-semibold text-[#004E89]">{v}</span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Top referrers</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-800">
              {stats.top_referrers.map((r) => (
                <li key={r.referrer_code}>
                  <span className="font-mono">{r.referrer_code}</span> — {r.referrals} referrals
                </li>
              ))}
            </ol>
            {stats.top_referrers.length === 0 ? <p className="mt-2 text-sm text-slate-500">No referrals yet.</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "blue" | "orange" | "green" | "slate";
}) {
  const ring =
    accent === "blue"
      ? "ring-[#004E89]/20"
      : accent === "orange"
        ? "ring-[#FF6B35]/25"
        : accent === "green"
          ? "ring-[#00C853]/25"
          : "ring-slate-200";
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-2 ${ring}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-extrabold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
