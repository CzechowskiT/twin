"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Alternative = {
  id: string;
  label: string;
  impact_preview?: { mutates_state_on_preview?: boolean; claim_kind?: string };
};

type Decision = {
  id: number;
  status: string;
  review_id?: number | null;
  question?: { text?: string; requires_approval?: boolean };
  evidence_package?: {
    supporting?: unknown[];
    contradicting?: unknown[];
    unknowns?: unknown[];
  };
  alternatives?: Alternative[];
  counterfactuals?: { id: string; simulation_only?: boolean; mutates_state?: boolean }[];
  rationale?: { text?: string; silent?: boolean; causality_claim?: boolean };
  decision_hash?: string | null;
  immutable?: boolean;
  stale?: boolean;
  version?: number;
  requires_approval?: boolean;
  silent?: boolean;
};

type Aggregate = {
  decisions?: Decision[];
  routes?: Record<string, string>;
  safety?: Record<string, unknown>;
};

function DecisionJournalPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const reviewIdParam = params.get("review_id");
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [rationale, setRationale] = useState("");
  const [lastResult, setLastResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<Aggregate>("/api/v1/candidates/me/strategy-reviews", {}, token);
      setAgg(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("decisionJournal.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function act(path: string, body: Record<string, unknown> = {}) {
    const token = getToken();
    if (!token) return null;
    setBusy(true);
    try {
      const out = await apiFetch<Record<string, unknown>>(
        path,
        { method: "POST", body: JSON.stringify(body) },
        token,
      );
      await load();
      return out;
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("decisionJournal.actionFailed"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  const decisions = agg?.decisions || [];

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("decisionJournal.eyebrow")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header>
          <p className="text-sm uppercase tracking-wide text-[var(--twin-muted)]">
            {t("decisionJournal.eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold">{t("decisionJournal.title")}</h1>
          <p className="text-sm text-[var(--twin-muted)]">{t("decisionJournal.lead")}</p>
        </header>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {lastResult ? (
          <p className="text-sm text-[var(--twin-muted)]" role="status">
            {lastResult}
          </p>
        ) : null}

        <Card className="flex flex-col gap-3" data-decision-create>
          <h2 className="text-lg font-semibold">{t("decisionJournal.createTitle")}</h2>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("decisionJournal.questionLabel")}</span>
            <input
              className="rounded border border-[var(--twin-border)] bg-transparent px-3 py-2"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("decisionJournal.rationaleLabel")}</span>
            <textarea
              className="min-h-[4rem] rounded border border-[var(--twin-border)] bg-transparent px-3 py-2"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              maxLength={500}
            />
          </label>
          <Button
            type="button"
            disabled={busy || !question.trim()}
            onClick={async () => {
              const out = await act("/api/v1/candidates/me/strategy-reviews/decisions", {
                question: question.trim(),
                rationale: rationale.trim() || undefined,
                review_id: reviewIdParam ? Number(reviewIdParam) : undefined,
                supporting: [{ ref: "funnel", claim_kind: "INFERENCE" }],
                contradicting: [],
                unknowns: [{ code: "INSUFFICIENT_DATA", claim_kind: "UNKNOWN" }],
                alternatives: [
                  {
                    id: "keep",
                    label: "Keep current strategy",
                    impact_preview: {
                      ranking_effect: "NONE_UNTIL_APPROVED",
                      mutates_state_on_preview: false,
                    },
                  },
                  {
                    id: "tilt_outcome",
                    label: "Slightly increase outcome weight",
                    impact_preview: {
                      ranking_effect: "UNKNOWN_UNTIL_APPROVED",
                      mutates_state_on_preview: false,
                    },
                  },
                ],
                counterfactuals: [
                  {
                    id: "cf1",
                    if: "If I keep current weights",
                    then: "Ranking stays as today (simulation only)",
                    mutates_state: false,
                    simulation_only: true,
                  },
                ],
              });
              if (out) {
                setQuestion("");
                setRationale("");
                setLastResult(t("decisionJournal.created"));
              }
            }}
          >
            {t("decisionJournal.create")}
          </Button>
        </Card>

        <Card className="flex flex-col gap-3" data-decision-journal>
          <h2 className="text-lg font-semibold">{t("decisionJournal.listTitle")}</h2>
          <ul className="flex flex-col gap-4 text-sm">
            {decisions.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-2 border-b border-[var(--twin-border)] py-3"
                data-decision-id={d.id}
              >
                <span>
                  #{d.id} · {d.status} · v{d.version ?? 1} · stale={String(!!d.stale)} · approval=
                  {String(!!d.requires_approval)} · silent={String(!!d.silent)}
                </span>
                <span className="text-[var(--twin-muted)]">{d.question?.text}</span>
                <span className="text-xs text-[var(--twin-muted)]">
                  evidence s/c/u=
                  {(d.evidence_package?.supporting || []).length}/
                  {(d.evidence_package?.contradicting || []).length}/
                  {(d.evidence_package?.unknowns || []).length}
                  {" · "}
                  alts={(d.alternatives || []).length}
                  {" · "}
                  cf={(d.counterfactuals || []).length}
                  {" · "}
                  hash={d.decision_hash || "—"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {(d.alternatives || []).map((a) => (
                    <Button
                      key={a.id}
                      type="button"
                      disabled={busy || !["draft", "revised"].includes(d.status) || !!d.stale}
                      onClick={async () => {
                        const out = await act(
                          `/api/v1/candidates/me/strategy-reviews/decisions/${d.id}/propose`,
                          { chosen_alternative_id: a.id },
                        );
                        if (out) setLastResult(`${t("decisionJournal.proposed")}: ${a.label}`);
                      }}
                    >
                      {t("decisionJournal.propose")} · {a.label}
                    </Button>
                  ))}
                </div>
                {d.status === "pending_approval" ? (
                  <span className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={busy || !!d.stale}
                      onClick={async () => {
                        const out = await act(
                          `/api/v1/candidates/me/strategy-reviews/decisions/${d.id}/resolve`,
                          { action: "approve" },
                        );
                        if (out)
                          setLastResult(
                            `${t("decisionJournal.approved")} ranking=${String(!!out.ranking_changed)}`,
                          );
                      }}
                    >
                      {t("decisionJournal.approve")}
                    </Button>
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const out = await act(
                          `/api/v1/candidates/me/strategy-reviews/decisions/${d.id}/resolve`,
                          { action: "reject" },
                        );
                        if (out)
                          setLastResult(
                            `${t("decisionJournal.rejected")} mutate=${String(!!out.state_mutated)}`,
                          );
                      }}
                    >
                      {t("decisionJournal.reject")}
                    </Button>
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const out = await act(
                          `/api/v1/candidates/me/strategy-reviews/decisions/${d.id}/resolve`,
                          { action: "postpone" },
                        );
                        if (out)
                          setLastResult(
                            `${t("decisionJournal.postponed")} mutate=${String(!!out.state_mutated)}`,
                          );
                      }}
                    >
                      {t("decisionJournal.postpone")}
                    </Button>
                  </span>
                ) : null}
                {d.status === "approved_executed" ? (
                  <span className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void act(`/api/v1/candidates/me/strategy-reviews/decisions/${d.id}/followups`, {
                          kind: "observe",
                          body: { note: "Follow-up observation" },
                        })
                      }
                    >
                      {t("decisionJournal.followup")}
                    </Button>
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void act(`/api/v1/candidates/me/strategy-reviews/decisions/${d.id}/reconfirm`)
                      }
                    >
                      {t("decisionJournal.reconfirm")}
                    </Button>
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void act(`/api/v1/candidates/me/strategy-reviews/decisions/${d.id}/revise`, {
                          rationale: "Candidate revision",
                        })
                      }
                    >
                      {t("decisionJournal.revise")}
                    </Button>
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const out = await act(
                          `/api/v1/candidates/me/strategy-reviews/decisions/${d.id}/revert`,
                        );
                        if (out)
                          setLastResult(
                            `${t("decisionJournal.reverted")} restored=${String(!!out.ranking_restored)}`,
                          );
                      }}
                    >
                      {t("decisionJournal.revert")}
                    </Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>

        <p className="text-xs text-[var(--twin-muted)]">
          <Link className="twin-link" href="/dashboard/review-center">
            {t("reviewCenter.eyebrow")}
          </Link>
          {" · "}
          <Link className="twin-link" href="/dashboard/approvals">
            {t("careerLifecycle.approvals")}
          </Link>
          {" · "}
          <Link className="twin-link" href="/dashboard/career">
            {t("decisionJournal.dailyOsLink")}
          </Link>
          {" · "}
          {t("decisionJournal.disclaimer")}
        </p>
      </main>
    </Shell>
  );
}


export default function DecisionJournalPage() {
  return (
    <Suspense fallback={null}>
      <DecisionJournalPageContent />
    </Suspense>
  );
}
