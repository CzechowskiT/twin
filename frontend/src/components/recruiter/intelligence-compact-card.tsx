"use client";

/** Compact intelligence chip for inbox/pipeline lists — no sample data. */
export type IntelligenceCompact = {
  candidate_id?: number;
  extraction_status?: string;
  fit_band?: string | null;
  top_strengths?: string[];
  top_gap_or_unknown?: string | null;
  human_review_required?: boolean;
} | null;

export function IntelligenceCompactCard({
  intelligence,
  candidateId,
}: {
  intelligence?: IntelligenceCompact;
  candidateId?: number | null;
}) {
  if (!intelligence && !candidateId) return null;
  const band = intelligence?.fit_band;
  const status = intelligence?.extraction_status || "absent";
  const strengths = (intelligence?.top_strengths || []).slice(0, 2);
  const gap = intelligence?.top_gap_or_unknown;
  const id = intelligence?.candidate_id || candidateId;
  return (
    <div
      className="mt-2 rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-700"
      data-testid="intelligence-compact-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">AI assist</span>
        {band ? <span className="rounded bg-white px-1.5 py-0.5 border">{band}</span> : null}
        <span className="text-neutral-500">{status}</span>
        {intelligence?.human_review_required !== false ? (
          <span className="text-amber-800">Review required</span>
        ) : null}
      </div>
      {strengths.length > 0 ? (
        <p className="mt-1 truncate text-neutral-600">+ {strengths.join(" · ")}</p>
      ) : null}
      {gap ? <p className="mt-0.5 truncate text-neutral-500">? {gap}</p> : null}
      {id ? (
        <a
          className="mt-1 inline-block text-neutral-900 underline"
          href={`/recruiter/candidates/${id}`}
        >
          Open intelligence
        </a>
      ) : null}
    </div>
  );
}
