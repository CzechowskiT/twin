"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { applicationStatusKey } from "@/lib/application-status";

export type FeedbackInsights = {
  skill_tool_gaps: string[];
  positioning_gaps: string[];
  what_stronger_candidates_showed: string[];
  upskill_actions: { title: string; priority: string; rationale: string }[];
  summary?: string | null;
  parsed_at?: string | null;
  source?: string | null;
};

export type ApplicationRow = {
  id: number;
  job_id: number;
  status: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  job_board: string;
  notes?: string | null;
  recruiter_feedback_raw?: string | null;
  feedback_insights?: FeedbackInsights | null;
  updated_at?: string;
  placement_state?: string;
  placement_work_email?: string | null;
  placement_reported_at?: string | null;
  placement_verified_at?: string | null;
};

export type FeedbackBusy = { id: number; kind: "save" | "parse" } | null;

const STATUSES = ["pending", "applied", "interview", "rejected", "hired"] as const;

function normalizeApplicationSelectStatus(status: string): (typeof STATUSES)[number] {
  const s = status.trim().toLowerCase();
  return (STATUSES as readonly string[]).includes(s) ? (s as (typeof STATUSES)[number]) : "pending";
}

function showPlacementRow(app: ApplicationRow): boolean {
  const s = app.status.trim().toLowerCase();
  return s === "applied" || s === "interview" || s === "hired";
}

export function ApplicationsPanel({
  items,
  onStatusChange,
  onRemove,
  onSaveFeedback,
  onParseFeedback,
  feedbackBusy,
  onPlacementVerifyStart,
  placementBusyId,
}: {
  items: ApplicationRow[];
  onStatusChange: (id: number, status: string) => void;
  onRemove: (id: number) => void;
  onSaveFeedback: (id: number, raw: string) => Promise<void>;
  onParseFeedback: (id: number) => Promise<void>;
  feedbackBusy: FeedbackBusy;
  onPlacementVerifyStart?: (id: number, workEmail: string) => Promise<void>;
  placementBusyId?: number | null;
}) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<number | null>(null);
  const [draftById, setDraftById] = useState<Record<number, string>>({});
  const [workEmailById, setWorkEmailById] = useState<Record<number, string>>({});

  useEffect(() => {
    setDraftById((prev) => {
      const next = { ...prev };
      for (const app of items) {
        const fromApi = app.recruiter_feedback_raw ?? "";
        if (next[app.id] === undefined) next[app.id] = fromApi;
      }
      return next;
    });
  }, [items]);

  function draftFor(app: ApplicationRow): string {
    return draftById[app.id] ?? app.recruiter_feedback_raw ?? "";
  }

  return (
    <ul className="space-y-2 text-sm">
      {items.map((app) => {
        const busy = feedbackBusy?.id === app.id ? feedbackBusy.kind : null;
        const draft = draftFor(app);
        const ins = app.feedback_insights;
        return (
          <li
            key={app.id}
            className="twin-card-inset flex flex-col gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <a href={app.url} target="_blank" rel="noopener noreferrer" className="twin-link font-medium">
                {app.title}
              </a>
              <p className="twin-muted mt-0.5 text-xs">
                {app.company}
                {app.location ? ` · ${app.location}` : ""} · {app.job_board}
              </p>
              {onPlacementVerifyStart && showPlacementRow(app) ? (
                <div className="mt-2 max-w-md space-y-2 rounded border border-[var(--twin-accent)]/25 bg-[var(--twin-accent-muted)]/25 p-2 text-xs">
                  <p className="leading-relaxed text-[var(--twin-muted-strong)]">{t("dashboard.placementVerifyHint")}</p>
                  {(app.placement_state ?? "none") === "verified" ? (
                    <p className="font-semibold text-[var(--twin-accent)]">{t("dashboard.placementVerified")}</p>
                  ) : (
                    <>
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder={t("dashboard.placementWorkEmailPlaceholder")}
                        value={workEmailById[app.id] ?? app.placement_work_email ?? ""}
                        disabled={placementBusyId === app.id}
                        onChange={(e) =>
                          setWorkEmailById((prev) => ({ ...prev, [app.id]: e.target.value }))
                        }
                        className="w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5 text-[var(--foreground)]"
                      />
                      <button
                        type="button"
                        disabled={
                          placementBusyId === app.id ||
                          !(workEmailById[app.id] ?? app.placement_work_email ?? "").trim()
                        }
                        onClick={() =>
                          void onPlacementVerifyStart(
                            app.id,
                            (workEmailById[app.id] ?? app.placement_work_email ?? "").trim(),
                          )
                        }
                        className="twin-btn-solid twin-touch-target !w-auto px-3 py-1.5 text-xs"
                      >
                        {placementBusyId === app.id ? "…" : t("dashboard.placementSendLink")}
                      </button>
                      {(app.placement_state ?? "none") === "verify_pending" ? (
                        <p className="text-[var(--twin-muted)]">{t("dashboard.placementVerifyPending")}</p>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
              <button
                type="button"
                className="twin-link mt-2 text-xs font-medium"
                onClick={() => setOpenId((v) => (v === app.id ? null : app.id))}
              >
                {openId === app.id ? "− " : "+ "}
                {t("dashboard.appFeedbackToggle")}
              </button>
              {openId === app.id ? (
                <div className="mt-3 space-y-3 border-t border-[var(--twin-border)] pt-3">
                  <p className="text-xs leading-relaxed text-[var(--twin-muted)]">{t("dashboard.appFeedbackHint")}</p>
                  <textarea
                    className="min-h-[120px] w-full max-w-2xl rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--twin-muted)] focus:border-[var(--twin-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--twin-accent)]/20"
                    placeholder={t("dashboard.appFeedbackPlaceholder")}
                    value={draft}
                    disabled={busy !== null}
                    onChange={(e) =>
                      setDraftById((prev) => ({
                        ...prev,
                        [app.id]: e.target.value,
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => onSaveFeedback(app.id, draft)}
                      className="twin-btn-secondary twin-touch-target !w-auto px-3 py-1.5 text-xs"
                    >
                      {busy === "save" ? t("dashboard.appFeedbackSaving") : t("dashboard.appFeedbackSave")}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null || !draft.trim()}
                      onClick={() => onParseFeedback(app.id)}
                      className="twin-btn-solid twin-touch-target !w-auto px-3 py-1.5 text-xs"
                    >
                      {busy === "parse" ? t("dashboard.appFeedbackParsing") : t("dashboard.appFeedbackParse")}
                    </button>
                  </div>
                  {ins ? (
                    <div className="max-w-2xl space-y-3 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/40 p-3 text-xs">
                      {ins.summary ? (
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">{t("dashboard.appFeedbackSummary")}</p>
                          <p className="mt-1 whitespace-pre-wrap text-[var(--twin-muted-strong)]">{ins.summary}</p>
                        </div>
                      ) : null}
                      {ins.skill_tool_gaps?.length ? (
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">{t("dashboard.appFeedbackSkillGaps")}</p>
                          <ul className="mt-1 list-inside list-disc text-[var(--twin-muted-strong)]">
                            {ins.skill_tool_gaps.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {ins.positioning_gaps?.length ? (
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">
                            {t("dashboard.appFeedbackPositioning")}
                          </p>
                          <ul className="mt-1 list-inside list-disc text-[var(--twin-muted-strong)]">
                            {ins.positioning_gaps.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {ins.what_stronger_candidates_showed?.length ? (
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">{t("dashboard.appFeedbackStronger")}</p>
                          <ul className="mt-1 list-inside list-disc text-[var(--twin-muted-strong)]">
                            {ins.what_stronger_candidates_showed.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {ins.upskill_actions?.length ? (
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">{t("dashboard.appFeedbackUpskill")}</p>
                          <ul className="mt-1 space-y-2 text-[var(--twin-muted-strong)]">
                            {ins.upskill_actions.map((a) => (
                              <li key={a.title}>
                                <span className="font-medium text-[var(--foreground)]">[{a.priority}]</span> {a.title}
                                {a.rationale ? (
                                  <span className="mt-0.5 block text-[var(--twin-muted)]">{a.rationale}</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <select
                value={normalizeApplicationSelectStatus(app.status)}
                onChange={(e) => onStatusChange(app.id, e.target.value)}
                className="rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1 text-xs"
                aria-label={t("dashboard.applicationStatus")}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(applicationStatusKey(s))}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onRemove(app.id)}
                className="text-xs text-red-600 hover:underline"
              >
                {t("dashboard.removeApplication")}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
