"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { CandidateReadinessFlowBanner } from "@/components/candidate/candidate-readiness-flow-banner";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { CAREER_COMPASS_SHIP_STATUS } from "@/lib/seven-day-d2-candidate";

const MAX_VISIBLE_MILESTONES = 40;

type Ideal = {
  target_role_titles: string[];
  target_salary_gross_monthly_pln: number | null;
  work_formats: string[];
  must_have_tools: string[];
  key_responsibilities: string;
  industries: string[];
  location_preferences: string | null;
  target_horizon_months: number;
};

type Milestone = { id: string; title: string; week: number; xp: number; done: boolean; hint: string };
type Phase = { id: string; title: string; week_start: number; week_end: number; milestones: Milestone[] };
type Path = {
  phases: Phase[];
  xp_total: number;
  level: number;
  horizon_months: number;
  current_phase_index: number;
  source: string;
};
type Snapshot = {
  readiness_score: number;
  gaps_summary: string[];
  strengths_aligned: string[];
  you_are_here: string;
};

type CompassResponse = {
  configured: boolean;
  ideal: Ideal | null;
  path: Path | null;
  snapshot: Snapshot | null;
};

function splitCsv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function applyIdealToForm(d: CompassResponse, setters: {
  setRoles: (v: string) => void;
  setSalary: (v: string) => void;
  setFormats: (v: string) => void;
  setTools: (v: string) => void;
  setResp: (v: string) => void;
  setIndustries: (v: string) => void;
  setLocation: (v: string) => void;
  setHorizon: (v: string) => void;
}) {
  if (!d.ideal) return;
  setters.setRoles(d.ideal.target_role_titles.join(", "));
  setters.setSalary(d.ideal.target_salary_gross_monthly_pln != null ? String(d.ideal.target_salary_gross_monthly_pln) : "");
  setters.setFormats(d.ideal.work_formats.join(", "));
  setters.setTools(d.ideal.must_have_tools.join(", "));
  setters.setResp(d.ideal.key_responsibilities || "");
  setters.setIndustries(d.ideal.industries.join(", "));
  setters.setLocation(d.ideal.location_preferences || "");
  setters.setHorizon(String(d.ideal.target_horizon_months || 12));
}

export default function CareerCompassPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const loadOnce = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompassResponse | null>(null);
  const [roles, setRoles] = useState("");
  const [salary, setSalary] = useState("");
  const [formats, setFormats] = useState("");
  const [tools, setTools] = useState("");
  const [resp, setResp] = useState("");
  const [industries, setIndustries] = useState("");
  const [location, setLocation] = useState("");
  const [horizon, setHorizon] = useState("12");
  const [regenerate, setRegenerate] = useState(true);
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);
  const [showAllMilestones, setShowAllMilestones] = useState(false);

  const formSetters = useMemo(
    () => ({ setRoles, setSalary, setFormats, setTools, setResp, setIndustries, setLocation, setHorizon }),
    [],
  );

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return null;
    const d = await apiFetch<CompassResponse>("/api/v1/candidates/me/career-compass", {}, token);
    setData(d);
    applyIdealToForm(d, formSetters);
    return d;
  }, [formSetters]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    if (loadOnce.current) return;
    loadOnce.current = true;
    queueMicrotask(() => {
      void load()
        .catch((e) => setError(e instanceof Error ? e.message : t("dashboard.identityError")))
        .finally(() => setLoading(false));
    });
  }, [router, load, t]);

  const visiblePhases = useMemo(() => {
    const phases = data?.path?.phases ?? [];
    if (showAllMilestones) return phases;
    let count = 0;
    const out: Phase[] = [];
    for (const ph of phases) {
      const remaining = MAX_VISIBLE_MILESTONES - count;
      if (remaining <= 0) break;
      const milestones = ph.milestones.slice(0, remaining);
      count += milestones.length;
      out.push({ ...ph, milestones });
    }
    return out;
  }, [data?.path?.phases, showAllMilestones]);

  const totalMilestoneCount = useMemo(
    () => (data?.path?.phases ?? []).reduce((n, ph) => n + ph.milestones.length, 0),
    [data?.path?.phases],
  );

  const milestonesTruncated = !showAllMilestones && totalMilestoneCount > MAX_VISIBLE_MILESTONES;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    const hz = Math.min(60, Math.max(1, Number(horizon) || 12));
    const body = {
      ideal: {
        target_role_titles: splitCsv(roles),
        target_salary_gross_monthly_pln: salary.trim() ? Number(salary) : null,
        work_formats: splitCsv(formats).map((x) => x.toLowerCase()),
        must_have_tools: splitCsv(tools),
        key_responsibilities: resp,
        industries: splitCsv(industries),
        location_preferences: location.trim() || null,
        target_horizon_months: hz,
      },
      regenerate_path: regenerate,
    };
    try {
      const d = await apiFetch<CompassResponse>(
        "/api/v1/candidates/me/career-compass",
        { method: "PUT", body: JSON.stringify(body) },
        token,
      );
      setData(d);
      applyIdealToForm(d, formSetters);
      setShowAllMilestones(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleMilestone(id: string, done: boolean) {
    const token = getToken();
    if (!token) return;
    setToggleBusy(id);
    setError(null);
    try {
      const d = await apiFetch<CompassResponse>(
        `/api/v1/candidates/me/career-compass/milestones/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify({ done }) },
        token,
      );
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setToggleBusy(null);
    }
  }

  async function clearCompass() {
    const token = getToken();
    if (!token) return;
    if (!globalThis.confirm(t("dashboard.careerCompassDeleteConfirm"))) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/v1/candidates/me/career-compass", { method: "DELETE" }, token);
      setData({ configured: false, ideal: null, path: null, snapshot: null });
      setRoles("");
      setSalary("");
      setFormats("");
      setTools("");
      setResp("");
      setIndustries("");
      setLocation("");
      setHorizon("12");
      setShowAllMilestones(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Shell wide rail>
        <p className="twin-muted text-sm">{t("dashboard.billingLoading")}</p>
      </Shell>
    );
  }

  const snap = data?.snapshot;
  const path = data?.path;
  const xp = path?.xp_total ?? 0;
  const level = path?.level ?? 1;
  const xpBarPct = Math.min(100, Math.round((xp % 400) / 4));

  return (
    <Shell wide rail>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="twin-section-title text-xl sm:text-2xl">{t("dashboard.careerCompassPageTitle")}</h1>
          <WorkspaceStatusBadge status={CAREER_COMPASS_SHIP_STATUS} />
        </div>
        <CandidateWorkspaceSubnav ariaLabel={t("dashboard.careerCompassPageTitle")} />
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/dashboard" className="twin-link">
          {t("profile.backToDashboard")}
        </Link>
        <Link href="/profile" className="twin-link">
          {t("nav.profile")}
        </Link>
      </div>

      <CandidateReadinessFlowBanner context="career_brief" />

      <Card variant="soft" className="mb-6">
        <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("dashboard.careerCompassPageLead")}</p>
        {path ? (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-medium text-[var(--foreground)]">
              <span>
                {t("dashboard.careerCompassXpBar")
                  .replace("{xp}", String(xp))
                  .replace("{level}", String(level))}
              </span>
              {snap ? <span>{snap.readiness_score}%</span> : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--twin-border)]">
              <div
                className="h-full rounded-full bg-[var(--twin-accent)] transition-all"
                style={{ width: `${xpBarPct}%` }}
              />
            </div>
          </div>
        ) : null}
      </Card>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {!data?.configured && !path ? (
        <Card variant="soft" className="mb-6" data-seven-day-career-static-framework>
          <h2 className="mb-2 text-sm font-semibold">{t("dashboard.careerCompassStaticFrameworkTitle")}</h2>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.careerCompassStaticFrameworkLead")}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--twin-border)]/70 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted)]">
                {t("dashboard.careerCompassStaticTargetRoleTitle")}
              </h3>
              <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">{t("dashboard.careerCompassStaticTargetRoleLead")}</p>
            </div>
            <div className="rounded-lg border border-[var(--twin-border)]/70 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted)]">
                {t("dashboard.careerCompassStaticSkillsGapTitle")}
              </h3>
              <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">{t("dashboard.careerCompassStaticSkillsGapLead")}</p>
            </div>
            <div className="rounded-lg border border-[var(--twin-border)]/70 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted)]">
                {t("dashboard.careerCompassStaticNextStepsTitle")}
              </h3>
              <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">{t("dashboard.careerCompassStaticNextStepsLead")}</p>
            </div>
            <div className="rounded-lg border border-[var(--twin-border)]/70 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted)]">
                {t("dashboard.careerCompassStaticLearningTitle")}
              </h3>
              <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">{t("dashboard.careerCompassStaticLearningLead")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-[var(--twin-muted-strong)]">{t("dashboard.careerCompassNotConfigured")}</p>
        </Card>
      ) : null}

      {snap && data?.configured ? (
        <Card className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">{t("dashboard.careerCompassWhereYouAre")}</h2>
          <p className="whitespace-pre-wrap text-sm text-[var(--twin-muted-strong)]">{snap.you_are_here}</p>
          {snap.gaps_summary.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted)]">
                {t("dashboard.careerCompassGaps")}
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-[var(--twin-muted-strong)]">
                {snap.gaps_summary.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {snap.strengths_aligned.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted)]">
                {t("dashboard.careerCompassStrengths")}
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-[var(--twin-muted-strong)]">
                {snap.strengths_aligned.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      {visiblePhases.length > 0 ? (
        <Card className="mb-6">
          <h2 className="mb-4 text-sm font-semibold">{t("dashboard.careerCompassPath")}</h2>
          <ol className="space-y-6">
            {visiblePhases.map((ph, idx) => (
              <li key={ph.id} className="border-l-2 border-[var(--twin-accent)]/40 pl-4">
                <p className="font-medium text-[var(--foreground)]">{ph.title}</p>
                <p className="twin-muted text-xs">
                  {t("dashboard.careerCompassWeeks")
                    .replace("{start}", String(ph.week_start))
                    .replace("{end}", String(ph.week_end))}
                </p>
                <ul className="mt-2 space-y-2">
                  {ph.milestones.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-col gap-2 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${m.done ? "text-[var(--twin-muted)] line-through" : ""}`}>
                          {m.title}
                        </p>
                        {m.hint ? <p className="twin-muted mt-1 text-xs">{m.hint}</p> : null}
                        <p className="twin-muted mt-1 text-xs">
                          +{m.xp} XP · week {m.week}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={toggleBusy === m.id}
                        onClick={() => void toggleMilestone(m.id, !m.done)}
                        className="twin-btn-secondary twin-touch-target shrink-0 !w-auto px-3 py-1.5 text-xs"
                      >
                        {toggleBusy === m.id
                          ? "…"
                          : m.done
                            ? t("dashboard.careerCompassMarkOpen")
                            : t("dashboard.careerCompassMarkDone")}
                      </button>
                    </li>
                  ))}
                </ul>
                {path && idx === path.current_phase_index ? (
                  <p className="mt-2 text-xs font-medium text-[var(--twin-accent)]">
                    → {t("dashboard.careerCompassCurrentPhase")}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
          {milestonesTruncated ? (
            <button
              type="button"
              className="twin-link mt-4 text-sm font-semibold"
              onClick={() => setShowAllMilestones(true)}
            >
              {t("dashboard.careerCompassShowAllMilestones").replace("{count}", String(totalMilestoneCount))}
            </button>
          ) : null}
        </Card>
      ) : data?.configured ? (
        <p className="twin-muted mb-6 text-sm">{t("dashboard.careerCompassNotConfigured")}</p>
      ) : null}

      <Card>
        <h2 className="mb-4 text-sm font-semibold">{t("dashboard.careerCompassIdealSection")}</h2>
        <form onSubmit={onSubmit} className="max-w-2xl space-y-3">
          <Label>{t("dashboard.careerCompassRoles")}</Label>
          <Input value={roles} onChange={(e) => setRoles(e.target.value)} required placeholder="VP Engineering, …" />
          <Label>{t("dashboard.careerCompassSalary")}</Label>
          <Input value={salary} onChange={(e) => setSalary(e.target.value)} type="number" min={0} placeholder="25000" />
          <Label>{t("dashboard.careerCompassWorkFormats")}</Label>
          <Input value={formats} onChange={(e) => setFormats(e.target.value)} placeholder="hybrid, remote" />
          <Label>{t("dashboard.careerCompassTools")}</Label>
          <Input value={tools} onChange={(e) => setTools(e.target.value)} placeholder="Snowflake, dbt, …" />
          <Label>{t("dashboard.careerCompassIndustries")}</Label>
          <Input value={industries} onChange={(e) => setIndustries(e.target.value)} />
          <Label>{t("dashboard.careerCompassLocation")}</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          <Label>{t("dashboard.careerCompassResponsibilities")}</Label>
          <textarea
            className="mb-4 min-h-[100px] w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm"
            value={resp}
            onChange={(e) => setResp(e.target.value)}
          />
          <Label>{t("dashboard.careerCompassHorizon")}</Label>
          <Input value={horizon} onChange={(e) => setHorizon(e.target.value)} type="number" min={1} max={60} />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={regenerate}
              onChange={(e) => setRegenerate(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--twin-border)]"
            />
            {t("dashboard.careerCompassRegenerate")}
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? t("dashboard.careerCompassSaving") : t("dashboard.careerCompassSave")}
            </Button>
            <button
              type="button"
              className="twin-btn-secondary twin-touch-target !w-auto px-4 py-2 text-sm"
              disabled={saving}
              onClick={() => {
                setLoading(true);
                void load()
                  .catch((e) => setError(e instanceof Error ? e.message : "Error"))
                  .finally(() => setLoading(false));
              }}
            >
              {t("dashboard.careerCompassReload")}
            </button>
            {data?.configured ? (
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                disabled={saving}
                onClick={() => void clearCompass()}
              >
                {t("dashboard.careerCompassDelete")}
              </button>
            ) : null}
          </div>
        </form>
      </Card>
    </Shell>
  );
}
