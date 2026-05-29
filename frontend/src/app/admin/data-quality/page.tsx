"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "twin_ops_admin_token";

type DataQuality = {
  total_jobs: number;
  validated_jobs: number;
  validated_pct: number;
  missing_location: number;
  missing_location_pct: number;
  missing_salary: number;
  missing_salary_pct: number;
  stale_jobs_30d: number;
  stale_jobs_30d_pct: number;
  by_board: Record<string, number>;
};

export default function AdminDataQualityPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<DataQuality | null>(null);
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
      const res = await fetch("/api/ops-admin/data-quality", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      setData((await res.json()) as DataQuality);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return (
    <main className="twin-shell twin-shell--wide py-10">
      <h1 className="mb-2 text-2xl font-semibold">Data quality</h1>
      <p className="twin-muted mb-6 text-sm">Scraped job listing health (ops token).</p>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Total jobs" value={String(data.total_jobs)} />
          <Stat label="Validated" value={`${data.validated_jobs} (${data.validated_pct}%)`} />
          <Stat label="Missing location" value={`${data.missing_location} (${data.missing_location_pct}%)`} />
          <Stat label="Missing salary" value={`${data.missing_salary} (${data.missing_salary_pct}%)`} />
          <Stat label="Stale 30d+" value={`${data.stale_jobs_30d} (${data.stale_jobs_30d_pct}%)`} />
        </div>
      ) : null}
      {data?.by_board && Object.keys(data.by_board).length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">By board</h2>
          <ul className="space-y-1 text-sm">
            {Object.entries(data.by_board).map(([board, count]) => (
              <li key={board} className="flex justify-between gap-4 border-b border-[var(--twin-border)] py-2">
                <span>{board}</span>
                <span className="font-mono">{count}</span>
              </li>
            ))}
          </ul>
        </section>
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
