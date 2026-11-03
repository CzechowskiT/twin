"use client";

/**
 * Career Copilot 2.0 + Adaptive Intelligence — /dashboard/career.
 * Claim kinds: FACT | INFERENCE | SUGGESTION | UNKNOWN. History never silently overwritten.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";

const API = "/api/v1/candidates/me/career-copilot";

type Direction = {
  path_key: string;
  title: string;
  status: string;
  probability?: number | null;
  confidence?: string;
  effort?: string | null;
  risk?: string | null;
  timeline_months?: number | null;
  market_demand?: string | null;
  salary_trend?: string | null;
};
type Action = {
  id: number;
  horizon: string;
  title: string;
  status: string;
  claim_kind?: string;
  priority?: number;
};
type Goal = { id: number; title: string; status: string; progress_percent: number };
type Memory = {
  id: number;
  memory_key: string;
  kind: string;
  title: string;
  confidence?: string;
  claim_kind?: string;
  version?: number;
  source?: string;
};
type Pref = {
  id: number;
  pref_key: string;
  value: Record<string, unknown>;
  confidence?: string;
  evidence?: string[];
  claim_kind?: string;
  user_override?: boolean;
};
type TimelineEv = { id: number; event_type: string; title: string; claim_kind?: string; occurred_at?: string };
type SkillEv = {
  skill: string;
  status: string;
  next_exercise?: string | null;
  confidence?: string;
  claim_kind?: string;
  evidence?: string[];
};
type Ranked = {
  id: number;
  title: string;
  rank_score: number;
  ranking_explain?: { factors?: { factor: string; delta: number; why: string }[] };
};
type HealthDim = { score?: number; explain?: string; claim?: string };
type Scenario = {
  id: number;
  title: string;
  comparison?: { options?: Record<string, { risk?: string; salary_trend?: string; pros?: string[]; cons?: string[] }> };
  confidence?: string;
};
type LoopEntry = {
  id: number;
  useful?: boolean | null;
  prediction_correct?: boolean | null;
  surprise?: string | null;
  improve_reasoning?: string | null;
};
type Aggregate = {
  overview?: {
    where_am_i?: { role?: string | null; skills_count?: number; unknowns?: string[] };
    what_next?: { action?: string | null; horizon?: string | null };
    biggest_opportunity?: { text?: string; claim?: string };
    biggest_risk?: { text?: string };
    if_i_do_nothing?: { text?: string };
    ai_kill_switch?: boolean;
  };
  directions?: Direction[];
  actions?: Action[];
  goals?: Goal[];
  gaps?: { missing_competencies?: { skill?: string; kind?: string }[]; blockers?: { text?: string }[] };
  market?: { salary_band?: string; role_demand?: string; note?: string };
  decisions?: {
    id: number;
    title: string;
    comparison?: {
      options?: Record<string, { risk?: string; salary_trend?: string; pros?: string[]; cons?: string[] }>;
    };
  }[];
  explainability?: { claim_kinds?: string[] };
  safety?: { ai_kill_switch?: boolean };
  adaptive?: {
    memories?: Memory[];
    preferences?: Pref[];
    timeline?: TimelineEv[];
    skill_evolution?: SkillEv[];
    ranked_recommendations?: Ranked[];
    health?: {
      overall_score?: number;
      dimensions?: Record<string, HealthDim>;
      note?: string;
      confidence?: string;
    };
    scenarios?: Scenario[];
    learning_loop?: LoopEntry[];
    evolution?: { never_starts_from_zero?: boolean };
  };
};

const TABS = [
  "overview",
  "directions",
  "roadmap",
  "goals",
  "decisions",
  "timeline",
  "evolution",
  "memory",
  "health",
  "scenarios",
  "learning",
] as const;
type Tab = (typeof TABS)[number];

const TAB_KEYS: Record<Tab, TranslationKey> = {
  overview: "careerCopilot.tabOverview",
  directions: "careerCopilot.tabDirections",
  roadmap: "careerCopilot.tabRoadmap",
  goals: "careerCopilot.tabGoals",
  decisions: "careerCopilot.tabDecisions",
  timeline: "careerCopilot.tabTimeline",
  evolution: "careerCopilot.tabEvolution",
  memory: "careerCopilot.tabMemory",
  health: "careerCopilot.tabHealth",
  scenarios: "careerCopilot.tabScenarios",
  learning: "careerCopilot.tabLearning",
};

function ClaimBadge({ kind }: { kind?: string }) {
  const k = (kind || "UNKNOWN").toUpperCase();
  const color =
    k === "FACT"
      ? "bg-emerald-100 text-emerald-900"
      : k === "INFERENCE"
        ? "bg-sky-100 text-sky-900"
        : k === "SUGGESTION"
          ? "bg-amber-100 text-amber-900"
          : "bg-neutral-100 text-neutral-700";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${color}`}>
      {k}
    </span>
  );
}

export function CareerCopilotPanel() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Aggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [surprise, setSurprise] = useState("");
  const [improve, setImprove] = useState("");
  const [useful, setUseful] = useState<boolean | null>(null);
  const [predOk, setPredOk] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setError(null);
    try {
      const d = await apiFetch<Aggregate>(API, {}, token);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("careerCopilot.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const d = await apiFetch<Aggregate>(`${API}/refresh`, { method: "POST" }, token);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("careerCopilot.loadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function overrideDirection(pathKey: string, action: "accept" | "reject" | "restart") {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `${API}/directions/${encodeURIComponent(pathKey)}/override`,
        { method: "POST", body: JSON.stringify({ action }) },
        token,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("careerCopilot.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function completeAction(id: number) {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`${API}/actions/${id}`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) }, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("careerCopilot.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function addGoal() {
    const token = getToken();
    if (!token || !goalTitle.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`${API}/goals`, { method: "POST", body: JSON.stringify({ title: goalTitle.trim() }) }, token);
      setGoalTitle("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("careerCopilot.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function runSimulate() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `${API}/simulate`,
        {
          method: "POST",
          body: JSON.stringify({ options: ["stay", "offer_a", "change_specialization", "freelance"] }),
        },
        token,
      );
      await load();
      setTab("decisions");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("careerCopilot.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function runScenarios() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `${API}/scenarios`,
        {
          method: "POST",
          body: JSON.stringify({
            options: ["stay", "job_a", "job_b", "abroad", "freelance", "management"],
            title: "Adaptive scenario set",
          }),
        },
        token,
      );
      await load();
      setTab("scenarios");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("careerCopilot.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function submitLearning() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `${API}/learning-loop`,
        {
          method: "POST",
          body: JSON.stringify({
            useful,
            prediction_correct: predOk,
            surprise: surprise.trim() || null,
            improve_reasoning: improve.trim() || null,
          }),
        },
        token,
      );
      setSurprise("");
      setImprove("");
      setUseful(null);
      setPredOk(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("careerCopilot.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="twin-muted text-sm">{t("common.loadingEllipsis")}</p>;
  }

  const ov = data?.overview;
  const ad = data?.adaptive;
  const health = ad?.health;

  return (
    <section
      className="mb-8 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface,transparent)] p-4"
      data-testid="career-copilot-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{t("careerCopilot.title")}</h2>
          <p className="twin-muted mt-1 max-w-prose text-sm">{t("careerCopilot.lead")}</p>
          {ad?.evolution?.never_starts_from_zero ? (
            <p className="mt-1 text-xs text-emerald-800">{t("careerCopilot.adaptiveReuse")}</p>
          ) : null}
        </div>
        <Button
          type="button"
          className="border border-[var(--twin-border)] bg-transparent"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {t("careerCopilot.refresh")}
        </Button>
      </div>

      {data?.safety?.ai_kill_switch || ov?.ai_kill_switch ? (
        <p className="mt-2 text-xs text-amber-800" data-testid="career-copilot-degraded">
          {t("careerCopilot.aiDegraded")}
        </p>
      ) : null}

      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === id
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "bg-[var(--twin-border)]/40 text-[var(--foreground)]"
            }`}
            onClick={() => setTab(id)}
          >
            {t(TAB_KEYS[id])}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="career-copilot-overview">
          <div className="rounded border border-[var(--twin-border)] p-3">
            <p className="text-xs text-neutral-500">{t("careerCopilot.whereAmI")}</p>
            <p className="mt-1 text-sm font-medium">
              {ov?.where_am_i?.role || t("careerCopilot.roleUnknown")} · {ov?.where_am_i?.skills_count ?? 0}{" "}
              {t("careerCopilot.skills")}
            </p>
            <ClaimBadge kind="FACT" />
          </div>
          <div className="rounded border border-[var(--twin-border)] p-3">
            <p className="text-xs text-neutral-500">{t("careerCopilot.whatNext")}</p>
            <p className="mt-1 text-sm font-medium">{ov?.what_next?.action || "—"}</p>
            <ClaimBadge kind="SUGGESTION" />
          </div>
          <div className="rounded border border-[var(--twin-border)] p-3">
            <p className="text-xs text-neutral-500">{t("careerCopilot.opportunity")}</p>
            <p className="mt-1 text-sm">{ov?.biggest_opportunity?.text || "—"}</p>
            <ClaimBadge kind={ov?.biggest_opportunity?.claim} />
          </div>
          <div className="rounded border border-[var(--twin-border)] p-3">
            <p className="text-xs text-neutral-500">{t("careerCopilot.doNothing")}</p>
            <p className="mt-1 text-sm">{ov?.if_i_do_nothing?.text || "—"}</p>
            <ClaimBadge kind="INFERENCE" />
          </div>
          <div className="rounded border border-[var(--twin-border)] p-3 sm:col-span-2">
            <p className="text-xs text-neutral-500">{t("careerCopilot.market")}</p>
            <p className="mt-1 text-sm">
              {t("careerCopilot.salaryBand")}: {data?.market?.salary_band || "UNKNOWN"} · {t("careerCopilot.demand")}:{" "}
              {data?.market?.role_demand || "UNKNOWN"}
            </p>
            <p className="twin-muted mt-1 text-xs">{data?.market?.note}</p>
            <ClaimBadge kind="UNKNOWN" />
          </div>
          {(data?.gaps?.missing_competencies || []).length > 0 ? (
            <div className="rounded border border-[var(--twin-border)] p-3 sm:col-span-2">
              <p className="text-xs text-neutral-500">{t("careerCopilot.gaps")}</p>
              <ul className="mt-2 list-inside list-disc text-sm">
                {(data?.gaps?.missing_competencies || []).slice(0, 6).map((g) => (
                  <li key={g.skill}>{g.skill}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {(ad?.ranked_recommendations || []).length > 0 ? (
            <div className="rounded border border-[var(--twin-border)] p-3 sm:col-span-2">
              <p className="text-xs text-neutral-500">{t("careerCopilot.rankedTitle")}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {(ad?.ranked_recommendations || []).slice(0, 5).map((r) => (
                  <li key={r.id}>
                    {r.title} · score {r.rank_score}
                    <ClaimBadge kind="INFERENCE" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "directions" ? (
        <ul className="mt-4 space-y-3" data-testid="career-copilot-directions">
          {(data?.directions || []).map((d) => (
            <li key={d.path_key} className="rounded border border-[var(--twin-border)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="twin-muted mt-1 text-xs">
                    P≈{d.probability ?? "—"} · {d.effort}/{d.risk} · {d.timeline_months ?? "?"}mo ·{" "}
                    {t("careerCopilot.market")}: {d.market_demand} · {t("careerCopilot.salaryBand")}: {d.salary_trend}
                  </p>
                  <ClaimBadge kind="SUGGESTION" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.status !== "accepted" ? (
                    <Button
                      type="button"
                      className="border border-[var(--twin-border)] bg-transparent"
                      disabled={busy}
                      onClick={() => void overrideDirection(d.path_key, "accept")}
                    >
                      {t("careerCopilot.accept")}
                    </Button>
                  ) : null}
                  {d.status !== "rejected" ? (
                    <Button
                      type="button"
                      className="border border-[var(--twin-border)] bg-transparent"
                      disabled={busy}
                      onClick={() => void overrideDirection(d.path_key, "reject")}
                    >
                      {t("careerCopilot.reject")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="border border-[var(--twin-border)] bg-transparent"
                      disabled={busy}
                      onClick={() => void overrideDirection(d.path_key, "restart")}
                    >
                      {t("careerCopilot.restart")}
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">{d.status}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "roadmap" ? (
        <ul className="mt-4 space-y-2" data-testid="career-copilot-roadmap">
          {(data?.actions || []).map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--twin-border)] px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="twin-muted text-xs">
                  {a.horizon} · {a.status}
                </p>
                <ClaimBadge kind={a.claim_kind || "SUGGESTION"} />
              </div>
              {a.status !== "completed" ? (
                <Button
                  type="button"
                  className="border border-[var(--twin-border)] bg-transparent"
                  disabled={busy}
                  onClick={() => void completeAction(a.id)}
                >
                  {t("careerCopilot.markDone")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "goals" ? (
        <div className="mt-4 space-y-3" data-testid="career-copilot-goals">
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[12rem] flex-1 rounded-md border border-[var(--twin-border)] bg-transparent px-3 py-2 text-sm"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder={t("careerCopilot.goalPlaceholder")}
              maxLength={300}
            />
            <Button type="button" disabled={busy || !goalTitle.trim()} onClick={() => void addGoal()}>
              {t("careerCopilot.addGoal")}
            </Button>
          </div>
          <ul className="space-y-2">
            {(data?.goals || []).map((g) => (
              <li key={g.id} className="rounded border border-[var(--twin-border)] px-3 py-2 text-sm">
                {g.title} · {g.status} · {g.progress_percent}%
              </li>
            ))}
            {(data?.goals || []).length === 0 ? (
              <li className="twin-muted text-sm">{t("careerCopilot.noGoals")}</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {tab === "decisions" ? (
        <div className="mt-4 space-y-3" data-testid="career-copilot-decisions">
          <Button type="button" disabled={busy} onClick={() => void runSimulate()}>
            {t("careerCopilot.runSimulator")}
          </Button>
          {(data?.decisions || []).map((d) => (
            <div key={d.id} className="rounded border border-[var(--twin-border)] p-3">
              <p className="font-medium">{d.title}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {Object.entries(d.comparison?.options || {}).map(([key, val]) => (
                  <div key={key} className="rounded bg-[var(--twin-border)]/20 p-2 text-xs">
                    <p className="font-semibold">{key}</p>
                    <p>
                      {t("careerCopilot.risk")}: {val.risk} · {t("careerCopilot.salaryBand")}: {val.salary_trend}
                    </p>
                    <ClaimBadge kind="UNKNOWN" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "timeline" ? (
        <ul className="mt-4 space-y-2" data-testid="career-copilot-timeline">
          {(ad?.timeline || []).length === 0 ? (
            <li className="twin-muted text-sm">{t("careerCopilot.timelineEmpty")}</li>
          ) : null}
          {(ad?.timeline || []).map((ev) => (
            <li key={ev.id} className="rounded border border-[var(--twin-border)] px-3 py-2 text-sm">
              <p className="font-medium">{ev.title}</p>
              <p className="twin-muted text-xs">
                {ev.event_type} · {ev.occurred_at || "—"}
              </p>
              <ClaimBadge kind={ev.claim_kind} />
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "evolution" ? (
        <ul className="mt-4 space-y-2" data-testid="career-copilot-evolution">
          {(ad?.skill_evolution || []).length === 0 ? (
            <li className="twin-muted text-sm">{t("careerCopilot.evolutionEmpty")}</li>
          ) : null}
          {(ad?.skill_evolution || []).map((s) => (
            <li key={s.skill} className="rounded border border-[var(--twin-border)] px-3 py-2 text-sm">
              <p className="font-medium">
                {s.skill} · {s.status}
              </p>
              {s.next_exercise ? (
                <p className="twin-muted mt-1 text-xs">
                  {t("careerCopilot.skillNext")}: {s.next_exercise}
                </p>
              ) : null}
              <ClaimBadge kind={s.claim_kind} />
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "memory" ? (
        <div className="mt-4 space-y-3" data-testid="career-copilot-memory">
          <div>
            <p className="text-xs text-neutral-500">{t("careerCopilot.prefsTitle")}</p>
            <ul className="mt-2 space-y-2">
              {(ad?.preferences || []).map((p) => (
                <li key={p.id} className="rounded border border-[var(--twin-border)] px-3 py-2 text-sm">
                  <p className="font-medium">
                    {p.pref_key} {p.user_override ? "(override)" : ""}
                  </p>
                  <p className="twin-muted text-xs">
                    {t("careerCopilot.prefsEvidence")}: {(p.evidence || []).join(", ") || "—"} · {p.confidence}
                  </p>
                  <ClaimBadge kind={p.claim_kind} />
                </li>
              ))}
            </ul>
          </div>
          <ul className="space-y-2">
            {(ad?.memories || []).length === 0 ? (
              <li className="twin-muted text-sm">{t("careerCopilot.memoryEmpty")}</li>
            ) : null}
            {(ad?.memories || []).map((m) => (
              <li key={m.id} className="rounded border border-[var(--twin-border)] px-3 py-2 text-sm">
                <p className="font-medium">{m.title}</p>
                <p className="twin-muted text-xs">
                  {m.kind} · v{m.version} · {m.source} · {m.confidence}
                </p>
                <ClaimBadge kind={m.claim_kind} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "health" ? (
        <div className="mt-4 space-y-3" data-testid="career-copilot-health">
          <p className="text-sm font-medium">
            {t("careerCopilot.healthOverall")}: {health?.overall_score ?? "—"} / 100
          </p>
          <p className="twin-muted text-xs">{health?.note || t("careerCopilot.healthNote")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(health?.dimensions || {}).map(([key, dim]) => (
              <div key={key} className="rounded border border-[var(--twin-border)] p-3 text-sm">
                <p className="font-medium">
                  {key}: {dim.score ?? 0}
                </p>
                <p className="twin-muted mt-1 text-xs">{dim.explain}</p>
                <ClaimBadge kind={dim.claim} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "scenarios" ? (
        <div className="mt-4 space-y-3" data-testid="career-copilot-scenarios">
          <Button type="button" disabled={busy} onClick={() => void runScenarios()}>
            {t("careerCopilot.scenarioRun")}
          </Button>
          {(ad?.scenarios || []).length === 0 ? (
            <p className="twin-muted text-sm">{t("careerCopilot.scenarioEmpty")}</p>
          ) : null}
          {(ad?.scenarios || []).map((s) => (
            <div key={s.id} className="rounded border border-[var(--twin-border)] p-3">
              <p className="font-medium">{s.title}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {Object.entries(s.comparison?.options || {}).map(([key, val]) => (
                  <div key={key} className="rounded bg-[var(--twin-border)]/20 p-2 text-xs">
                    <p className="font-semibold">{key}</p>
                    <p>
                      {t("careerCopilot.risk")}: {(val as { risk?: string }).risk || "UNKNOWN"} ·{" "}
                      {t("careerCopilot.salaryBand")}: {(val as { salary_trend?: string }).salary_trend || "UNKNOWN"}
                    </p>
                    <ClaimBadge kind="UNKNOWN" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "learning" ? (
        <div className="mt-4 space-y-3" data-testid="career-copilot-learning">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm">{t("careerCopilot.learningUseful")}</span>
            <Button
              type="button"
              className="border border-[var(--twin-border)] bg-transparent"
              disabled={busy}
              onClick={() => setUseful(true)}
            >
              {t("careerCopilot.learningYes")}
            </Button>
            <Button
              type="button"
              className="border border-[var(--twin-border)] bg-transparent"
              disabled={busy}
              onClick={() => setUseful(false)}
            >
              {t("careerCopilot.learningNo")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm">{t("careerCopilot.learningCorrect")}</span>
            <Button
              type="button"
              className="border border-[var(--twin-border)] bg-transparent"
              disabled={busy}
              onClick={() => setPredOk(true)}
            >
              {t("careerCopilot.learningYes")}
            </Button>
            <Button
              type="button"
              className="border border-[var(--twin-border)] bg-transparent"
              disabled={busy}
              onClick={() => setPredOk(false)}
            >
              {t("careerCopilot.learningNo")}
            </Button>
          </div>
          <input
            className="w-full rounded-md border border-[var(--twin-border)] bg-transparent px-3 py-2 text-sm"
            value={surprise}
            onChange={(e) => setSurprise(e.target.value)}
            placeholder={t("careerCopilot.learningSurprise")}
            maxLength={2000}
          />
          <input
            className="w-full rounded-md border border-[var(--twin-border)] bg-transparent px-3 py-2 text-sm"
            value={improve}
            onChange={(e) => setImprove(e.target.value)}
            placeholder={t("careerCopilot.learningImprove")}
            maxLength={2000}
          />
          <Button type="button" disabled={busy} onClick={() => void submitLearning()}>
            {t("careerCopilot.learningSubmit")}
          </Button>
          <ul className="space-y-2">
            {(ad?.learning_loop || []).map((e) => (
              <li key={e.id} className="rounded border border-[var(--twin-border)] px-3 py-2 text-xs">
                useful={String(e.useful)} · correct={String(e.prediction_correct)} · {e.surprise || "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="twin-muted mt-4 text-[11px]">{t("careerCopilot.disclaimer")}</p>
    </section>
  );
}
