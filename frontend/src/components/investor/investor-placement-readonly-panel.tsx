"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type PlacementSummary = {
  total_events: number;
  by_event_type: Record<string, number>;
  write_forbidden: boolean;
  source: string;
};

export function InvestorPlacementReadonlyPanel() {
  const [summary, setSummary] = useState<PlacementSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    void apiFetch<PlacementSummary>("/api/v1/platform/wave4/placement/summary", {}, token)
      .then(setSummary)
      .catch(() => setError("Unable to load placement summary."));
  }, []);

  return (
    <Card
      variant="soft"
      className="mb-6 border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid="investor-placement-readonly-panel"
    >
      <h2 className="text-lg font-semibold">Placement verification (read-only)</h2>
      <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">
        Append-only event counts from the platform — write paths forbidden on this surface.
      </p>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {summary ? (
        <div className="mt-4 space-y-3 text-sm">
          <p>
            Total events: <span className="font-medium">{summary.total_events}</span>
            <span className="twin-muted ml-2 text-xs">source: {summary.source}</span>
          </p>
          {Object.keys(summary.by_event_type).length > 0 ? (
            <ul className="space-y-1">
              {Object.entries(summary.by_event_type).map(([type, count]) => (
                <li key={type} className="font-mono text-xs">
                  {type}: {count}
                </li>
              ))}
            </ul>
          ) : (
            <p className="twin-muted text-xs">No placement events recorded yet.</p>
          )}
          {summary.write_forbidden ? (
            <p className="twin-muted text-xs">Write forbidden · Launch NO-GO · limited pilot boundary applies.</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
