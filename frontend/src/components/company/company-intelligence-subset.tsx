"use client";

/**
 * Company-approved intelligence subset — brief, strengths, gaps, decision state.
 * No recruiter notes / full CV / debug.
 */
import { useCallback, useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://twin-production-bcd9.up.railway.app";

type Subset = {
  available?: boolean;
  brief?: string | null;
  fit_band?: string | null;
  strengths?: string[];
  gaps?: string[];
  human_decision_state?: string;
  human_review_required?: boolean;
  autonomous_employment_decision?: boolean;
  disclaimer?: string;
};

export function CompanyIntelligenceSubset({
  candidateId,
  token,
}: {
  candidateId: string;
  token?: string;
}) {
  const [data, setData] = useState<Subset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opsToken, setOpsToken] = useState(token || "");

  useEffect(() => {
    if (token) return;
    try {
      setOpsToken(sessionStorage.getItem("twin_ops_admin_token") || "");
    } catch {
      /* ignore */
    }
  }, [token]);

  const load = useCallback(async () => {
    if (!opsToken.trim() || !/^\d+$/.test(candidateId)) return;
    setError(null);
    try {
      const res = await fetch(
        `${API}/api/v1/candidates/${candidateId}/intelligence/company-subset`,
        { headers: { Authorization: `Bearer ${opsToken.trim()}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as Subset);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "load failed");
    }
  }, [candidateId, opsToken]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!/^\d+$/.test(candidateId)) return null;

  return (
    <section
      className="mx-auto mt-4 max-w-5xl rounded border border-neutral-200 bg-white p-4 text-sm"
      data-testid="company-intelligence-subset"
    >
      <h2 className="font-semibold">Company intelligence (approved subset)</h2>
      <p className="mt-1 text-xs text-neutral-600">
        {data?.disclaimer ||
          "AI-assisted. Humans make employment decisions. Recruiter-only notes are hidden."}
      </p>
      {!token ? (
        <input
          className="mt-2 w-full rounded border px-2 py-1 text-xs"
          type="password"
          placeholder="Ops Bearer"
          value={opsToken}
          onChange={(e) => setOpsToken(e.target.value)}
        />
      ) : null}
      {error ? <p className="mt-2 text-red-700">{error}</p> : null}
      {!data?.available ? (
        <p className="mt-3 text-neutral-600">No intelligence available yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          <p>{data.brief}</p>
          <p className="text-xs">
            Fit: <strong>{data.fit_band || "—"}</strong> · Decision:{" "}
            {data.human_decision_state} · Auto-hire:{" "}
            {String(data.autonomous_employment_decision)}
          </p>
          <ul className="list-disc pl-5 text-xs">
            {(data.strengths || []).map((s, i) => (
              <li key={`s-${i}`}>{s}</li>
            ))}
          </ul>
          <ul className="list-disc pl-5 text-xs text-neutral-600">
            {(data.gaps || []).map((g, i) => (
              <li key={`g-${i}`}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
