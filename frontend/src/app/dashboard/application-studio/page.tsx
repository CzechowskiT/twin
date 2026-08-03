"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Workspace = {
  id: number;
  title: string;
  status: string;
  fit?: { fit_kind?: string };
  readiness?: { ready_to_declare_submission?: boolean; checklist_done?: number };
  checklist?: { id: string; title: string; done: boolean }[];
  opportunity?: { title?: string; company?: string };
  external_submit?: boolean;
};

type Aggregate = {
  workspaces?: Workspace[];
  safety?: { external_submit?: boolean; auto_apply?: boolean };
  alembic?: string;
};

export default function ApplicationStudioPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [active, setActive] = useState<Workspace | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [desc, setDesc] = useState(
    "Backend Engineer\nRequirements:\n- Python and FastAPI\n- PostgreSQL\n- Celery experience\n- Evidence-backed delivery",
  );

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setErr(null);
    try {
      const data = await apiFetch<Aggregate>("/api/v1/candidates/me/application-studio", {}, token);
      setAgg(data);
      if (data.workspaces?.length) setActive(data.workspaces[0]);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("applicationStudio.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function createWorkspace() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ workspace: Workspace }>(
        "/api/v1/candidates/me/application-studio/workspaces",
        {
          method: "POST",
          body: JSON.stringify({
            title: "Synthetic Application Studio workspace",
            opportunity: {
              title: "Backend Engineer",
              company: "SynthCo",
              description: desc,
            },
          }),
        },
        token,
      );
      setActive(res.workspace);
      await load();
    } catch {
      setErr(t("applicationStudio.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function preparePackage(wsId: number) {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const evidenceRes = await apiFetch<{ evidence: { id: number } }>(
        "/api/v1/candidates/me/career-evidence/items",
        {
          method: "POST",
          body: JSON.stringify({
            evidence_type: "achievement",
            title: "FastAPI delivery with PostgreSQL",
            summary: "Built APIs with FastAPI and PostgreSQL — candidate-confirmed for studio",
            claim_kind: "CANDIDATE_CONFIRMED",
            skills: ["Python", "FastAPI", "PostgreSQL", "Celery"],
          }),
        },
        token,
      );
      const eid = evidenceRes.evidence?.id;
      const cv = await apiFetch<{ cv_draft: { id: number } }>(
        `/api/v1/candidates/me/application-studio/workspaces/${wsId}/cv-draft`,
        { method: "POST", body: JSON.stringify({ evidence_ids: eid ? [eid] : [] }) },
        token,
      );
      const cover = await apiFetch<{ cover_letter: { id: number } }>(
        `/api/v1/candidates/me/application-studio/workspaces/${wsId}/cover-letter`,
        { method: "POST", body: JSON.stringify({ evidence_ids: eid ? [eid] : [] }) },
        token,
      );
      await apiFetch(
        `/api/v1/candidates/me/application-studio/workspaces/${wsId}/screening`,
        {
          method: "POST",
          body: JSON.stringify({
            question: "Describe a delivery challenge",
            answer_text: "Led FastAPI migration — details from confirmed evidence only",
          }),
        },
        token,
      );
      await apiFetch(
        `/api/v1/candidates/me/application-studio/workspaces/${wsId}/approve`,
        {
          method: "POST",
          body: JSON.stringify({ artifact_type: "cv", artifact_id: cv.cv_draft.id, approved: true }),
        },
        token,
      );
      await apiFetch(
        `/api/v1/candidates/me/application-studio/workspaces/${wsId}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            artifact_type: "cover",
            artifact_id: cover.cover_letter.id,
            approved: true,
          }),
        },
        token,
      );
      const detail = await apiFetch<{ workspace: Workspace }>(
        `/api/v1/candidates/me/application-studio/workspaces/${wsId}`,
        {},
        token,
      );
      setActive(detail.workspace);
      await load();
    } catch {
      setErr(t("applicationStudio.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell wide rail>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">{t("applicationStudio.eyebrow")}</p>
          <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">
            {t("applicationStudio.title")}
          </h1>
          <p className="twin-muted mt-1 max-w-2xl text-sm">{t("applicationStudio.lead")}</p>
        </div>
        <CandidateWorkspaceSubnav ariaLabel={t("applicationStudio.title")} />
      </div>

      {err ? <p className="mb-3 text-sm text-red-700">{err}</p> : null}

      <Card className="mb-4">
        <p className="text-xs text-neutral-500">{t("applicationStudio.safetyBanner")}</p>
        <p className="mt-1 text-sm font-medium">
          {t("applicationStudio.noExternalSubmit")} · alembic={agg?.alembic || "—"}
        </p>
        <textarea
          className="mt-3 w-full rounded border border-[var(--twin-border)] bg-transparent p-2 text-sm"
          rows={4}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          aria-label={t("applicationStudio.opportunityLabel")}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void createWorkspace()}>
            {t("applicationStudio.create")}
          </Button>
          <Button
            type="button"
            className="border border-[var(--twin-border)] bg-transparent"
            disabled={busy || !active}
            onClick={() => active && void preparePackage(active.id)}
          >
            {t("applicationStudio.prepare")}
          </Button>
          <Button
            type="button"
            className="border border-[var(--twin-border)] bg-transparent"
            disabled={busy}
            onClick={() => void load()}
          >
            {t("applicationStudio.refresh")}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold">{t("applicationStudio.workspaces")}</h2>
          <ul className="mt-2 space-y-2">
            {(agg?.workspaces || []).map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  className="w-full rounded border border-[var(--twin-border)] px-3 py-2 text-left text-sm"
                  onClick={() => setActive(w)}
                >
                  <p className="font-medium">{w.title}</p>
                  <p className="twin-muted text-xs">
                    {w.fit?.fit_kind || "—"} · {w.status}
                  </p>
                </button>
              </li>
            ))}
            {(agg?.workspaces || []).length === 0 ? (
              <li className="twin-muted text-sm">{t("applicationStudio.empty")}</li>
            ) : null}
          </ul>
        </Card>

        <Card>
          <h2 className="text-base font-semibold">{t("applicationStudio.active")}</h2>
          {active ? (
            <div className="mt-2 space-y-2 text-sm">
              <p>
                <span className="twin-muted">{t("applicationStudio.fit")}: </span>
                {active.fit?.fit_kind || "—"}
              </p>
              <p>
                <span className="twin-muted">{t("applicationStudio.readiness")}: </span>
                {String(active.readiness?.ready_to_declare_submission ?? false)}
              </p>
              <ul className="space-y-1">
                {(active.checklist || []).map((c) => (
                  <li key={c.id} className="twin-muted text-xs">
                    {c.done ? "✓" : "○"} {c.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="twin-muted mt-2 text-sm">{t("applicationStudio.selectWorkspace")}</p>
          )}
        </Card>
      </div>

      <p className="twin-muted mt-4 text-[11px]">{t("applicationStudio.disclaimer")}</p>
    </Shell>
  );
}
