"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "twin_ops_admin_token";

type KeyRow = { id: number; label: string; scopes: string; created_at: string };

type MintOut = { id: number; label: string; scopes: string; token: string; header: string };

export default function AdminPartnerKeysPage() {
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<KeyRow[]>([]);
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState("export");
  const [minted, setMinted] = useState<MintOut | null>(null);
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
      const res = await fetch("/api/ops-admin/partner-api-keys", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { items: KeyRow[] };
      setRows(data.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  async function mint() {
    const t = token.trim();
    if (!t || !label.trim()) return;
    setLoading(true);
    setErr(null);
    setMinted(null);
    try {
      const res = await fetch("/api/ops-admin/partner-api-keys", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), scopes: scopes.trim() || "export" }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMinted((await res.json()) as MintOut);
      setLabel("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Mint failed");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: number) {
    const t = token.trim();
    if (!t) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ops-admin/partner-api-keys/${id}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="twin-shell twin-shell--wide py-10">
      <h1 className="mb-2 text-2xl font-semibold">Partner API keys</h1>
      <p className="twin-muted mb-6 text-sm">
        Mint hashed integrator tokens for CSV export. Copy the token once — it is not shown again.
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
      <div className="mb-6 flex flex-col gap-2 rounded-lg border border-[var(--twin-border)] p-4 sm:flex-row sm:items-end">
        <input
          className="twin-input min-w-0 flex-1"
          placeholder="Label (e.g. acme-ats)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className="twin-input w-full sm:w-40"
          placeholder="Scopes"
          value={scopes}
          onChange={(e) => setScopes(e.target.value)}
        />
        <button type="button" className="twin-btn-solid" disabled={loading || !label.trim()} onClick={() => void mint()}>
          Mint key
        </button>
      </div>
      {minted ? (
        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-semibold">Copy now — shown once</p>
          <p className="twin-muted mt-1 text-xs">
            Header: <code>{minted.header}</code>
          </p>
          <input readOnly className="twin-input mt-2 text-xs" value={minted.token} onFocus={(e) => e.target.select()} />
        </div>
      ) : null}
      {err ? <p className="mb-4 text-sm text-red-600">{err}</p> : null}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--twin-border)] px-4 py-3 text-sm"
          >
            <span>
              <strong>{r.label}</strong> · {r.scopes} · #{r.id}
            </span>
            <button type="button" className="twin-btn-ghost text-xs" disabled={loading} onClick={() => void revoke(r.id)}>
              Revoke
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/admin/metrics" className="twin-link">
          Metrics
        </Link>
        <Link href="/admin/placements" className="twin-link">
          Placements
        </Link>
        <Link href="/admin/recruiter-tokens" className="twin-link">
          Recruiter tokens
        </Link>
        <a href="/developers" className="twin-link">
          Developers
        </a>
      </div>
    </main>
  );
}
