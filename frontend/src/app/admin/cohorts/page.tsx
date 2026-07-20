"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "twin_ops_admin_token";

type Cohort = {
  id: number;
  name: string;
  cohort_type: string;
  market: string;
  status: string;
  target_count: number;
  participant_count?: number;
  campaign?: string | null;
  source?: string | null;
};

type Evidence = {
  participants_total?: number;
  participants_real?: number;
  participants_excluded_metrics?: number;
  steps_excluding_test?: Record<string, number>;
  north_star_excluding_test?: number;
  north_star_including_test_labeled?: { value?: number; label?: string };
  ttv_signup_to_first_match_sample_size?: number | null;
  blockers?: string[];
  gates?: Record<string, string>;
};

export default function AdminCohortsPage() {
  const [token, setToken] = useState("");
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) queueMicrotask(() => setToken(s));
    } catch {
      /* ignore */
    }
  }, []);

  const headers = useCallback(() => ({ Authorization: `Bearer ${token.trim()}` }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setMsg(null);
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
      const res = await fetch("/api/ops-admin/cohorts", { headers: headers(), cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const body = (await res.json()) as { cohorts?: Cohort[] };
      setCohorts(body.cohorts || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setCohorts([]);
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  const ensurePilot = useCallback(async () => {
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/ops-admin/cohorts/ensure-pl-pilot", {
        method: "POST",
        headers: headers(),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("PL pilot cohort ensured. FOUNDERS_ACTION_REQUIRED: invite real users (ops pack).");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ensure failed");
    }
  }, [headers, load]);

  const loadEvidence = useCallback(
    async (id: number) => {
      setSelectedId(id);
      setEvidence(null);
      setErr(null);
      try {
        const res = await fetch(`/api/ops-admin/cohorts/${id}/evidence`, {
          headers: headers(),
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        setEvidence((await res.json()) as Evidence);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Evidence failed");
      }
    },
    [headers],
  );

  const addParticipant = useCallback(async () => {
    if (!selectedId || !email.trim()) return;
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/ops-admin/cohorts/${selectedId}/participants`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: "candidate", status: "joined" }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg(`Added ${email.trim()}`);
      setEmail("");
      await loadEvidence(selectedId);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    }
  }, [selectedId, email, headers, loadEvidence, load]);

  const steps = evidence?.steps_excluding_test;

  return (
    <main className="twin-shell twin-shell--wide py-10">
      <p className="mb-2 text-sm">
        <Link href="/admin/metrics" className="underline">
          ← Product metrics
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold">Activation cohorts</h1>
      <p className="twin-muted mb-6 text-sm">
        Pilot registry only. Does not recruit users. Gate F stays PENDING until Founder fills N≥20.
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
        <button type="button" className="twin-btn-solid" onClick={() => void ensurePilot()}>
          Ensure PL pilot
        </button>
      </div>
      {err ? <p className="mb-4 text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="mb-4 text-sm text-emerald-700">{msg}</p> : null}

      <section className="mb-8 overflow-x-auto text-sm">
        <table className="w-full min-w-[36rem] border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-3">ID</th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">N / target</th>
              <th className="py-2 pr-3">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.id} className="border-b border-black/10">
                <td className="py-2 pr-3">{c.id}</td>
                <td className="py-2 pr-3">{c.name}</td>
                <td className="py-2 pr-3">
                  {c.cohort_type} · {c.market}
                </td>
                <td className="py-2 pr-3">{c.status}</td>
                <td className="py-2 pr-3">
                  {c.participant_count ?? 0} / {c.target_count}
                </td>
                <td className="py-2 pr-3">
                  <button type="button" className="underline" onClick={() => void loadEvidence(c.id)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cohorts.length === 0 ? <p className="twin-muted mt-3">No cohorts yet — create PL pilot first.</p> : null}
      </section>

      {selectedId ? (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Cohort {selectedId} evidence</h2>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <input
              className="twin-input min-w-0 flex-1"
              placeholder="Add participant by email (must already exist)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="button" className="twin-btn-solid" onClick={() => void addParticipant()}>
              Add participant
            </button>
          </div>
          {evidence ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Participants (real)" value={String(evidence.participants_real ?? 0)} />
                <Stat
                  label="Excluded metrics"
                  value={String(evidence.participants_excluded_metrics ?? 0)}
                />
                <Stat label="NS excl. test" value={String(evidence.north_star_excluding_test ?? 0)} />
                <Stat
                  label="TTV sample"
                  value={String(evidence.ttv_signup_to_first_match_sample_size ?? "—")}
                />
              </div>
              {steps ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {Object.entries(steps).map(([k, v]) => (
                    <Stat key={k} label={k} value={String(v)} />
                  ))}
                </div>
              ) : null}
              {evidence.north_star_including_test_labeled ? (
                <p className="twin-muted mt-4 text-xs">
                  NS including test (labeled): {evidence.north_star_including_test_labeled.value} —{" "}
                  {evidence.north_star_including_test_labeled.label}
                </p>
              ) : null}
              {evidence.blockers && evidence.blockers.length > 0 ? (
                <ul className="mt-4 list-disc pl-5 text-sm">
                  {evidence.blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
              {evidence.gates ? (
                <p className="twin-muted mt-3 text-xs">
                  Gates unchanged: Gate F={evidence.gates.gate_f}, Launch={evidence.gates.launch}, Phase
                  3B={evidence.gates.phase_3b}
                </p>
              ) : null}
            </>
          ) : (
            <p className="twin-muted text-sm">Select Open to load evidence.</p>
          )}
        </section>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-black/10 px-3 py-2">
      <div className="twin-muted text-xs">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
