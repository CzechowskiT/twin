"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Process = {
  id: number;
  title: string;
  company?: string;
  role_title?: string;
  prep_gate?: { state?: string };
  snapshot_immutable?: boolean;
  coverage?: { evidence_linked?: number };
  covert_assistance?: boolean;
};

type Aggregate = {
  processes?: Process[];
  offers?: { id: number; title: string; company: string }[];
  safety?: Record<string, unknown>;
  alembic?: string;
};

export default function InterviewDecisionPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [active, setActive] = useState<Process | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setErr(null);
    try {
      const data = await apiFetch<Aggregate>("/api/v1/candidates/me/interview-decision", {}, token);
      setAgg(data);
      if (data.processes?.length) setActive(data.processes[0]);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("interviewDecision.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function runChain() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setStatus("");
    try {
      const evidenceRes = await apiFetch<{ evidence: { id: number } }>(
        "/api/v1/candidates/me/career-evidence/items",
        {
          method: "POST",
          body: JSON.stringify({
            evidence_type: "achievement",
            title: "FastAPI delivery for interview prep",
            summary: "Built APIs with FastAPI — candidate-confirmed",
            claim_kind: "CANDIDATE_CONFIRMED",
            skills: ["Python", "FastAPI"],
          }),
        },
        token,
      );
      const eid = evidenceRes.evidence?.id;
      const created = await apiFetch<{ process: Process }>(
        "/api/v1/candidates/me/interview-decision/processes",
        {
          method: "POST",
          body: JSON.stringify({
            title: "Synthetic interview process",
            company: "SynthCo",
            role_title: "Backend Engineer",
          }),
        },
        token,
      );
      const pid = created.process.id;
      const ans = await apiFetch<{ answer: { id: number } }>(
        `/api/v1/candidates/me/interview-decision/processes/${pid}/answers`,
        {
          method: "POST",
          body: JSON.stringify({
            question: "Tell me about a delivery challenge",
            evidence_ids: eid ? [eid] : [],
            likelihood: "LIKELY",
          }),
        },
        token,
      );
      await apiFetch(
        `/api/v1/candidates/me/interview-decision/processes/${pid}/answers/approve`,
        { method: "POST", body: JSON.stringify({ answer_id: ans.answer.id, approved: true }) },
        token,
      );
      await apiFetch(
        `/api/v1/candidates/me/interview-decision/processes/${pid}/mocks`,
        { method: "POST", body: "{}" },
        token,
      );
      const offer = await apiFetch<{ offer: { id: number } }>(
        "/api/v1/candidates/me/interview-decision/offers",
        {
          method: "POST",
          body: JSON.stringify({
            title: "Backend Engineer offer",
            company: "SynthCo",
            process_id: pid,
            provenance: "candidate_declared",
            terms: { base: "UNKNOWN", equity: "UNKNOWN" },
          }),
        },
        token,
      );
      const memo = await apiFetch<{ memo: { id: number } }>(
        "/api/v1/candidates/me/interview-decision/memos",
        {
          method: "POST",
          body: JSON.stringify({ process_id: pid, offer_id: offer.offer.id }),
        },
        token,
      );
      await apiFetch(
        `/api/v1/candidates/me/interview-decision/memos/${memo.memo.id}/declare`,
        {
          method: "POST",
          body: JSON.stringify({ decision: "hold", notes: "Need clarity on UNKNOWN terms" }),
        },
        token,
      );
      setStatus(t("interviewDecision.chainDone"));
      setActive(created.process);
      await load();
    } catch {
      setErr(t("interviewDecision.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell wide rail>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {t("interviewDecision.eyebrow")}
          </p>
          <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">
            {t("interviewDecision.title")}
          </h1>
          <p className="twin-muted mt-1 max-w-2xl text-sm">{t("interviewDecision.lead")}</p>
        </div>
        <CandidateWorkspaceSubnav ariaLabel={t("interviewDecision.title")} />
      </div>

      {err ? <p className="mb-3 text-sm text-red-700">{err}</p> : null}

      <Card className="mb-4" id="offers">
        <p className="text-xs text-neutral-500">{t("interviewDecision.safetyBanner")}</p>
        <p className="mt-1 text-sm font-medium">
          {t("interviewDecision.noCovert")} · alembic={agg?.alembic || "—"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void runChain()}>
            {t("interviewDecision.runChain")}
          </Button>
          <Button
            type="button"
            className="border border-[var(--twin-border)] bg-transparent"
            disabled={busy}
            onClick={() => void load()}
          >
            {t("interviewDecision.refresh")}
          </Button>
        </div>
        {status ? <p className="twin-muted mt-2 text-sm">{status}</p> : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2" id="decisions">
        <Card>
          <h2 className="text-base font-semibold">{t("interviewDecision.processes")}</h2>
          <ul className="mt-2 space-y-2">
            {(agg?.processes || []).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full rounded border border-[var(--twin-border)] px-3 py-2 text-left text-sm"
                  onClick={() => setActive(p)}
                >
                  <p className="font-medium">{p.title}</p>
                  <p className="twin-muted text-xs">
                    {p.prep_gate?.state || "—"} · immutable=
                    {String(p.snapshot_immutable ?? true)}
                  </p>
                </button>
              </li>
            ))}
            {(agg?.processes || []).length === 0 ? (
              <li className="twin-muted text-sm">{t("interviewDecision.empty")}</li>
            ) : null}
          </ul>
        </Card>

        <Card>
          <h2 className="text-base font-semibold">{t("interviewDecision.active")}</h2>
          {active ? (
            <div className="mt-2 space-y-2 text-sm">
              <p>
                <span className="twin-muted">{t("interviewDecision.gate")}: </span>
                {active.prep_gate?.state || "—"}
              </p>
              <p>
                <span className="twin-muted">{t("interviewDecision.company")}: </span>
                {active.company || "—"} / {active.role_title || "—"}
              </p>
              <p className="twin-muted text-xs">{t("interviewDecision.noGuaranteed")}</p>
            </div>
          ) : (
            <p className="twin-muted mt-2 text-sm">{t("interviewDecision.selectProcess")}</p>
          )}
          <h3 className="mt-4 text-sm font-semibold">{t("interviewDecision.offers")}</h3>
          <ul className="mt-1 space-y-1">
            {(agg?.offers || []).map((o) => (
              <li key={o.id} className="twin-muted text-xs">
                {o.title} · {o.company}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="twin-muted mt-4 text-[11px]">{t("interviewDecision.disclaimer")}</p>
    </Shell>
  );
}
