"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type TrustProofSummary = {
  counters: Record<string, number | string>;
  readonly: boolean;
  launch: string;
  pilot: string;
};

export function InvestorTrustProofReadonlyPanel() {
  const [summary, setSummary] = useState<TrustProofSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    void apiFetch<TrustProofSummary>("/api/v1/platform/wave4/trust-proof/summary", {}, token)
      .then(setSummary)
      .catch(() => setError("Unable to load trust proof summary."));
  }, []);

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid="investor-trust-proof-readonly-panel"
    >
      <h2 className="text-lg font-semibold">Trust proof counters (read-only)</h2>
      <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">
        Platform counters only — no external customer attestations or verified claims.
      </p>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {summary ? (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(summary.counters).map(([key, value]) => (
            <div key={key} className="rounded border border-[var(--twin-border)] px-3 py-2">
              <dt className="twin-muted text-xs uppercase tracking-wide">{key.replace(/_/g, " ")}</dt>
              <dd className="mt-1 font-medium">{String(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {summary ? (
        <p className="twin-muted mt-4 text-xs">
          Pilot: {summary.pilot} · Launch: {summary.launch}
        </p>
      ) : null}
    </Card>
  );
}
