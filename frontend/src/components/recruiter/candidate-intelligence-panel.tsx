"use client";

/**
 * AI Candidate Intelligence panel — production API, no sample/demo scores.
 * Humans make employment decisions; AI assists screening only.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://twin-production-bcd9.up.railway.app";

type IntelBundle = {
  ok?: boolean;
  extraction_status?: string;
  profile?: {
    extraction_status?: string;
    current_role?: string | null;
    current_employer?: string | null;
    seniority?: string | null;
    total_experience_months?: number | null;
    relevant_experience_months?: number | null;
    normalized_skills?: string[];
    profile_confidence?: string | null;
    warnings?: string[];
    updated_at?: string | null;
  } | null;
  timeline?: Array<{
    id: number;
    employer?: string | null;
    title?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    evidence_reference?: string | null;
    confidence?: string | null;
  }>;
  brief?: {
    brief?: string;
    factual_points?: string[];
    inferred_points?: string[];
    warnings?: string[];
  } | null;
  match?: {
    id?: number;
    overall_fit_band?: string;
    ai_fit_band?: string;
    numeric_score?: number | null;
    strengths?: Array<{ label?: string }>;
    gaps?: Array<{ label?: string }>;
    unknowns?: Array<{ reason?: string; field?: string }>;
    confidence?: string;
    human_review_required?: boolean;
  } | null;
  signals?: Array<{ id: number; signal_type: string; explanation: string }>;
  missing_information?: Array<{ id: number; field: string; reason?: string }>;
  stance?: { human_review_required?: boolean; autonomous_employment_decision?: boolean };
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export function CandidateIntelligencePanel({
  candidateId,
  token,
}: {
  candidateId: string;
  token?: string;
}) {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<IntelBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"overview" | "match" | "timeline" | "signals" | "missing" | "evidence">(
    "overview",
  );
  const [correctionRole, setCorrectionRole] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
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
    if (!opsToken.trim()) {
      setError(t("candidateIntel.tokenRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/candidates/${candidateId}/intelligence`, {
        headers: authHeaders(opsToken),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as IntelBundle);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setBusy(false);
    }
  }, [candidateId, opsToken, t]);

  useEffect(() => {
    if (opsToken) void load();
  }, [opsToken, load]);

  async function process(force = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/candidates/${candidateId}/intelligence/process`, {
        method: "POST",
        headers: authHeaders(opsToken),
        body: JSON.stringify({ force, locale }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as IntelBundle);
    } catch (e) {
      setError(e instanceof Error ? e.message : "process failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyCorrection() {
    if (!correctionRole.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/v1/candidates/${candidateId}/intelligence/corrections`, {
        method: "POST",
        headers: authHeaders(opsToken),
        body: JSON.stringify({
          corrections: { current_role: correctionRole.trim() },
          regenerate: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as IntelBundle);
      setCorrectionRole("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "correction failed");
    } finally {
      setBusy(false);
    }
  }

  async function overrideBand(band: string) {
    const matchId = data?.match?.id;
    if (!matchId) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/v1/intelligence/matches/${matchId}/override`, {
        method: "POST",
        headers: authHeaders(opsToken),
        body: JSON.stringify({ override_band: band, actor_label: "recruiter", notes: "UI override" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "override failed");
    } finally {
      setBusy(false);
    }
  }

  async function makeDraft() {
    setBusy(true);
    try {
      const res = await fetch(
        `${API}/api/v1/candidates/${candidateId}/intelligence/clarification-draft`,
        { method: "POST", headers: authHeaders(opsToken), body: "{}" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { draft?: string };
      setDraft(body.draft || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "draft failed");
    } finally {
      setBusy(false);
    }
  }

  const profile = data?.profile;
  const status = profile?.extraction_status || data?.extraction_status || "absent";

  return (
    <section
      className="mt-6 rounded border border-neutral-200 bg-white p-4 text-sm"
      data-testid="candidate-intelligence-panel"
      aria-label={t("candidateIntel.title")}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("candidateIntel.title")}</h2>
          <p className="mt-1 text-xs text-neutral-600">{t("candidateIntel.disclaimer")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border px-3 py-1.5 disabled:opacity-50"
            disabled={busy}
            onClick={() => void load()}
          >
            {t("candidateIntel.refresh")}
          </button>
          <button
            type="button"
            className="rounded bg-neutral-900 px-3 py-1.5 text-white disabled:opacity-50"
            disabled={busy || !opsToken}
            onClick={() => void process(true)}
          >
            {t("candidateIntel.regenerate")}
          </button>
        </div>
      </header>

      {!token ? (
        <label className="mt-3 block text-xs">
          {t("candidateIntel.tokenLabel")}
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            type="password"
            autoComplete="off"
            value={opsToken}
            onChange={(e) => setOpsToken(e.target.value)}
          />
        </label>
      ) : null}

      {error ? <p className="mt-3 text-red-700">{error}</p> : null}

      <p className="mt-3 text-xs text-neutral-500">
        {t("candidateIntel.status")}: <strong>{status}</strong>
        {profile?.profile_confidence ? ` · ${t("candidateIntel.confidence")}: ${profile.profile_confidence}` : ""}
        {data?.match?.overall_fit_band ? ` · Fit: ${data.match.overall_fit_band}` : ""}
      </p>

      {status === "absent" || !profile ? (
        <p className="mt-4 text-neutral-600">{t("candidateIntel.absent")}</p>
      ) : (
        <>
          <div className="mt-4 rounded bg-neutral-50 p-3">
            <p className="font-medium">{data?.brief?.brief || t("candidateIntel.noBrief")}</p>
            <p className="mt-2 text-xs text-neutral-600">
              {profile.current_role || "—"} @ {profile.current_employer || "—"} ·{" "}
              {t("candidateIntel.experience")}:{" "}
              {profile.total_experience_months != null
                ? `${Math.floor(profile.total_experience_months / 12)}y`
                : "—"}
            </p>
          </div>

          <nav className="mt-4 flex flex-wrap gap-2" aria-label="Intelligence sections">
            {(
              [
                ["overview", t("candidateIntel.tabOverview")],
                ["match", t("candidateIntel.tabMatch")],
                ["timeline", t("candidateIntel.tabTimeline")],
                ["signals", t("candidateIntel.tabSignals")],
                ["missing", t("candidateIntel.tabMissing")],
                ["evidence", t("candidateIntel.tabEvidence")],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`rounded px-2 py-1 text-xs ${tab === id ? "bg-neutral-900 text-white" : "border"}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-4 space-y-2">
            {tab === "overview" ? (
              <>
                <p>
                  {t("candidateIntel.skills")}:{" "}
                  {(profile.normalized_skills || []).slice(0, 12).join(", ") || "—"}
                </p>
                <p className="text-xs text-amber-800">{t("candidateIntel.humanReview")}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <input
                    className="min-w-[12rem] flex-1 rounded border px-2 py-1"
                    placeholder={t("candidateIntel.correctRole")}
                    value={correctionRole}
                    onChange={(e) => setCorrectionRole(e.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded border px-3 py-1 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void applyCorrection()}
                  >
                    {t("candidateIntel.saveCorrection")}
                  </button>
                  <button
                    type="button"
                    className="rounded border px-3 py-1 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void makeDraft()}
                  >
                    {t("candidateIntel.clarificationDraft")}
                  </button>
                </div>
                {draft ? (
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-amber-50 p-2 text-xs">
                    {draft}
                    {"\n"}({t("candidateIntel.draftUnsent")})
                  </pre>
                ) : null}
              </>
            ) : null}

            {tab === "match" && data?.match ? (
              <>
                <p>
                  Fit band: <strong>{data.match.overall_fit_band}</strong>
                  {data.match.numeric_score != null ? ` (${data.match.numeric_score})` : ""}
                </p>
                <ul className="list-disc pl-5">
                  {(data.match.strengths || []).slice(0, 5).map((s, i) => (
                    <li key={i}>{s.label}</li>
                  ))}
                </ul>
                <p className="text-xs text-neutral-600">{t("candidateIntel.gaps")}</p>
                <ul className="list-disc pl-5">
                  {(data.match.gaps || []).slice(0, 5).map((s, i) => (
                    <li key={i}>{s.label}</li>
                  ))}
                </ul>
                <p className="text-xs text-neutral-600">{t("candidateIntel.unknowns")}</p>
                <ul className="list-disc pl-5">
                  {(data.match.unknowns || []).slice(0, 5).map((s, i) => (
                    <li key={i}>{s.reason || s.field}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 pt-2">
                  {(["MATCH", "NO_MATCH", "UNKNOWN"] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void overrideBand(b)}
                    >
                      {t("candidateIntel.override")} {b}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {tab === "timeline" ? (
              <ul className="space-y-2">
                {(data?.timeline || []).length === 0 ? (
                  <li>{t("candidateIntel.noTimeline")}</li>
                ) : (
                  (data?.timeline || []).map((e) => (
                    <li key={e.id} className="border-t border-neutral-100 pt-2">
                      <strong>{e.title || "—"}</strong> @ {e.employer || "—"}
                      <br />
                      <span className="text-xs text-neutral-500">
                        {e.start_date} – {e.end_date} · {e.confidence}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            ) : null}

            {tab === "signals" ? (
              <ul className="list-disc pl-5">
                {(data?.signals || []).length === 0 ? (
                  <li>{t("candidateIntel.noSignals")}</li>
                ) : (
                  (data?.signals || []).map((s) => (
                    <li key={s.id}>
                      <strong>{s.signal_type}</strong>: {s.explanation}
                    </li>
                  ))
                )}
              </ul>
            ) : null}

            {tab === "missing" ? (
              <ul className="list-disc pl-5">
                {(data?.missing_information || []).length === 0 ? (
                  <li>{t("candidateIntel.noMissing")}</li>
                ) : (
                  (data?.missing_information || []).map((m) => (
                    <li key={m.id}>
                      {m.field}: {m.reason}
                    </li>
                  ))
                )}
              </ul>
            ) : null}

            {tab === "evidence" ? (
              <ul className="space-y-2 text-xs">
                {(data?.timeline || []).map((e) =>
                  e.evidence_reference ? (
                    <li key={e.id} className="rounded bg-neutral-50 p-2">
                      {e.evidence_reference}
                    </li>
                  ) : null,
                )}
                {(data?.brief?.factual_points || []).map((p, i) => (
                  <li key={`f-${i}`}>{p}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
