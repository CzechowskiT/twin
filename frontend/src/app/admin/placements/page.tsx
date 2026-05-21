"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "twin_ops_admin_token";

type DisputeRow = {
  application_id: number;
  company: string;
  job_title: string;
  candidate_email: string;
  placement_reported_at: string | null;
  updated_at: string;
};

export default function AdminPlacementsPage() {
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<DisputeRow[]>([]);
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
      const res = await fetch("/api/ops-admin/placement-disputes", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { items: DisputeRow[] };
      setRows(data.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return (
    <main className="twin-shell twin-shell--wide py-10">
      <h1 className="mb-2 text-2xl font-semibold">Placement dispute queue</h1>
      <p className="twin-muted mb-6 text-sm">Ops triage — in-app disputes only (no CS email threads).</p>
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
      {err ? <p className="mb-4 text-sm text-red-600">{err}</p> : null}
      {rows.length === 0 && !loading && !err ? (
        <p className="twin-muted text-sm">No disputed placements in queue.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.application_id}
              className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-4 py-3 text-sm"
            >
              <p className="font-semibold">
                {r.job_title} · {r.company}
              </p>
              <p className="twin-muted mt-1 text-xs">
                App #{r.application_id} · {r.candidate_email} · updated {new Date(r.updated_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 flex gap-4 text-sm">
        <Link href="/admin/metrics" className="twin-link">
          Metrics
        </Link>
        <Link href="/admin/data-quality" className="twin-link">
          Data quality
        </Link>
      </div>
    </main>
  );
}
