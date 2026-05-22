"use client";

import { useEffect, useMemo, useState } from "react";
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
  placement_declaration_note?: string | null;
  /** ISO timestamp when tailored auto-apply PDF was stored (S3). */
  auto_apply_package_uploaded_at?: string | null;
};

export type FeedbackBusy = { id: number; kind: "save" | "parse" } | null;

export type PlacementFlowBusy =
  | { id: number; kind: "declare" | "verify" | "employer_attest" | "dispute" }
  | null;

export type PlacementEventRow = {
  id: number;
  event_type: string;
  actor: string;
  detail: Record<string, unknown> | null;
  created_at: string;
};

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
  onPlacementDeclare,
  onPlacementVerifyStart,
  onPlacementEmployerAttest,
  onPlacementDispute,
  placementFlowBusy,
  onPlacementEventsLoad,
  placementEventsInvalidateKey,
  onOpenAutoApplyPackage,
  onOptimizeCv,
  onNegotiateSalary,
}: {
  items: ApplicationRow[];
  onStatusChange: (id: number, status: string) => void;
  onRemove: (id: number) => void;
  onSaveFeedback: (id: number, raw: string) => Promise<void>;
  onParseFeedback: (id: number) => Promise<void>;
  feedbackBusy: FeedbackBusy;
  onPlacementDeclare?: (id: number, note: string) => Promise<void>;
  onPlacementVerifyStart?: (id: number, workEmail: string) => Promise<void>;
  onPlacementEmployerAttest?: (id: number, employerEmail?: string) => Promise<string>;
  onPlacementDispute?: (id: number, reason: string) => Promise<void>;
  placementFlowBusy?: PlacementFlowBusy;
  onPlacementEventsLoad?: (applicationId: number) => Promise<PlacementEventRow[]>;
  /** Bump after declare/verify so the audit log refetches from the API on next open. */
  placementEventsInvalidateKey?: number;
  /** Fetch presigned URL and open tailored auto-apply PDF (when `auto_apply_package_uploaded_at` is set). */
  onOpenAutoApplyPackage?: (applicationId: number) => Promise<void>;
  onOptimizeCv?: (applicationId: number, jobTitle: string) => void;
  onNegotiateSalary?: (applicationId: number, jobTitle: string) => void;
}) {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number] | "all">("all");
  const [appSearch, setAppSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [draftById, setDraftById] = useState<Record<number, string>>({});
  const [workEmailById, setWorkEmailById] = useState<Record<number, string>>({});
  const [employerEmailById, setEmployerEmailById] = useState<Record<number, string>>({});
  const [disputeNoteById, setDisputeNoteById] = useState<Record<number, string>>({});
  const [declareNoteById, setDeclareNoteById] = useState<Record<number, string>>({});
  const [placementHistoryOpenId, setPlacementHistoryOpenId] = useState<number | null>(null);
  const [placementEventsByAppId, setPlacementEventsByAppId] = useState<Record<number, PlacementEventRow[]>>({});
  const [placementEventsLoadingId, setPlacementEventsLoadingId] = useState<number | null>(null);
  const [placementEventsErrById, setPlacementEventsErrById] = useState<Record<number, string>>({});
  const [packagePdfBusyId, setPackagePdfBusyId] = useState<number | null>(null);

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

  useEffect(() => {
    setDeclareNoteById((prev) => {
      const next = { ...prev };
      for (const app of items) {
        const note = app.placement_declaration_note ?? "";
        if (next[app.id] === undefined && note) next[app.id] = note;
      }
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (placementEventsInvalidateKey === undefined) return;
    setPlacementEventsByAppId({});
    setPlacementEventsErrById({});
    setPlacementEventsLoadingId(null);
    setPlacementHistoryOpenId(null);
  }, [placementEventsInvalidateKey]);

  function draftFor(app: ApplicationRow): string {
    return draftById[app.id] ?? app.recruiter_feedback_raw ?? "";
  }

  const visibleItems = useMemo(() => {
    let rows = statusFilter === "all" ? items : items.filter((a) => normalizeApplicationSelectStatus(a.status) === statusFilter);
    const q = appSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.company.toLowerCase().includes(q) ||
          Boolean(a.notes && a.notes.toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [items, statusFilter, appSearch]);

  return (
    <>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex flex-wrap items-center gap-2 text-xs text-[var(--twin-muted-strong)]">
          <span>{t("dashboard.appsFilterStatus")}</span>
          <select
            className="rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5 text-sm text-[var(--foreground)]"
            value={statusFilter}
            onChange={(e) => {
              const v = e.target.value;
              setStatusFilter(v === "all" ? "all" : (v as (typeof STATUSES)[number]));
            }}
          >
            <option value="all">{t("dashboard.appsFilterAll")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(applicationStatusKey(s))}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-[var(--twin-muted-strong)] sm:max-w-md">
          <span>{t("dashboard.appsSearchLabel")}</span>
          <input
            type="search"
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
            placeholder={t("dashboard.appsSearchPlaceholder")}
            className="w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--twin-muted)]"
          />
        </label>
      </div>
      <ul className="space-y-2 text-sm">
        {visibleItems.length === 0 ? (
          <li className="twin-muted rounded-lg border border-dashed border-[var(--twin-border)] px-3 py-6 text-center text-sm">
            {t("dashboard.appsFilterEmpty")}
          </li>
        ) : null}
        {visibleItems.map((app) => {
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
              {onPlacementDeclare && onPlacementVerifyStart && showPlacementRow(app) ? (
                <div className="mt-2 max-w-md space-y-2 rounded border border-[var(--twin-accent)]/25 bg-[var(--twin-accent-muted)]/25 p-2 text-xs">
                  {(app.placement_state ?? "none") === "disputed" ? (
                    <>
                      <p className="font-semibold text-amber-700">{t("dashboard.placementDisputed")}</p>
                      {onPlacementDispute ? (
                        <p className="twin-muted text-xs">{t("dashboard.placementDisputeHint")}</p>
                      ) : null}
                    </>
                  ) : (app.placement_state ?? "none") === "verified" ? (
                    <>
                      <p className="font-semibold text-[var(--twin-accent)]">{t("dashboard.placementVerified")}</p>
                      {app.placement_verified_at ? (
                        <p className="mt-1 text-xs text-[var(--twin-muted)]">
                          {t("dashboard.placementVerifiedAt").replace(
                            "{when}",
                            new Date(app.placement_verified_at).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }),
                          )}
                        </p>
                      ) : null}
                      {onPlacementDispute ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            className="w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5 text-xs"
                            placeholder={t("dashboard.placementDisputePlaceholder")}
                            value={disputeNoteById[app.id] ?? ""}
                            onChange={(e) =>
                              setDisputeNoteById((prev) => ({ ...prev, [app.id]: e.target.value }))
                            }
                          />
                          <button
                            type="button"
                            className="twin-btn-secondary text-xs"
                            disabled={placementFlowBusy?.id === app.id && placementFlowBusy.kind === "dispute"}
                            onClick={() => void onPlacementDispute(app.id, disputeNoteById[app.id] ?? "")}
                          >
                            {placementFlowBusy?.id === app.id && placementFlowBusy.kind === "dispute"
                              ? "…"
                              : t("dashboard.placementDispute")}
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : (app.placement_state ?? "none") === "none" ? (
                    <>
                      <p className="leading-relaxed text-[var(--twin-muted-strong)]">{t("dashboard.placementDeclareHint")}</p>
                      <textarea
                        className="min-h-[72px] w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5 text-[var(--foreground)] placeholder:text-[var(--twin-muted)]"
                        placeholder={t("dashboard.placementDeclareNotePlaceholder")}
                        value={declareNoteById[app.id] ?? ""}
                        disabled={placementFlowBusy?.id === app.id && placementFlowBusy.kind === "declare"}
                        onChange={(e) =>
                          setDeclareNoteById((prev) => ({ ...prev, [app.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        disabled={placementFlowBusy?.id === app.id && placementFlowBusy.kind === "declare"}
                        onClick={() => void onPlacementDeclare(app.id, declareNoteById[app.id] ?? "")}
                        className="twin-btn-solid twin-touch-target !w-auto px-3 py-1.5 text-xs"
                      >
                        {placementFlowBusy?.id === app.id && placementFlowBusy.kind === "declare"
                          ? "…"
                          : t("dashboard.placementDeclareSubmit")}
                      </button>
                    </>
                  ) : (
                    <>
                      {(app.placement_state ?? "none") === "declared" ? (
                        <p className="font-medium text-[var(--twin-accent-hover)]">{t("dashboard.placementDeclareDone")}</p>
                      ) : null}
                      {app.placement_declaration_note ? (
                        <p className="whitespace-pre-wrap rounded border border-[var(--twin-border)]/60 bg-[var(--twin-surface-raised)]/40 p-2 text-[var(--twin-muted-strong)]">
                          {app.placement_declaration_note}
                        </p>
                      ) : null}
                      {app.placement_reported_at &&
                      (app.placement_state ?? "none") !== "none" &&
                      (app.placement_state ?? "none") !== "verified" ? (
                        <p className="text-xs text-[var(--twin-muted)]">
                          {t("dashboard.placementDeclaredAt").replace(
                            "{when}",
                            new Date(app.placement_reported_at).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }),
                          )}
                        </p>
                      ) : null}
                      <p className="leading-relaxed text-[var(--twin-muted-strong)]">{t("dashboard.placementVerifyHint")}</p>
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder={t("dashboard.placementWorkEmailPlaceholder")}
                        value={workEmailById[app.id] ?? app.placement_work_email ?? ""}
                        disabled={placementFlowBusy?.id === app.id && placementFlowBusy.kind === "verify"}
                        onChange={(e) =>
                          setWorkEmailById((prev) => ({ ...prev, [app.id]: e.target.value }))
                        }
                        className="w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5 text-[var(--foreground)]"
                      />
                      <button
                        type="button"
                        disabled={
                          (placementFlowBusy?.id === app.id && placementFlowBusy.kind === "verify") ||
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
                        {placementFlowBusy?.id === app.id && placementFlowBusy.kind === "verify"
                          ? "…"
                          : t("dashboard.placementSendLink")}
                      </button>
                      {(app.placement_state ?? "none") === "verify_pending" ? (
                        <p className="text-[var(--twin-muted)]">{t("dashboard.placementVerifyPending")}</p>
                      ) : null}
                      {onPlacementEmployerAttest ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="email"
                            autoComplete="email"
                            placeholder={t("dashboard.placementEmployerEmailPlaceholder")}
                            value={employerEmailById[app.id] ?? ""}
                            onChange={(e) =>
                              setEmployerEmailById((prev) => ({ ...prev, [app.id]: e.target.value }))
                            }
                            className="w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            disabled={
                              placementFlowBusy?.id === app.id &&
                              placementFlowBusy.kind === "employer_attest"
                            }
                            onClick={() => {
                              void (async () => {
                                try {
                                  const url = await onPlacementEmployerAttest(
                                    app.id,
                                    employerEmailById[app.id],
                                  );
                                  await navigator.clipboard.writeText(url);
                                } catch {
                                  /* parent surfaces error */
                                }
                              })();
                            }}
                            className="twin-btn-secondary twin-touch-target !w-auto px-3 py-1.5 text-xs"
                          >
                            {placementFlowBusy?.id === app.id && placementFlowBusy.kind === "employer_attest"
                              ? "…"
                              : t("dashboard.placementEmployerAttest")}
                          </button>
                        </div>
                      ) : null}
                      {onPlacementDispute ? (
                        <button
                          type="button"
                          className="twin-link text-xs"
                          disabled={placementFlowBusy?.id === app.id && placementFlowBusy.kind === "dispute"}
                          onClick={() => void onPlacementDispute(app.id, disputeNoteById[app.id] ?? "")}
                        >
                          {t("dashboard.placementDispute")}
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
              {onPlacementEventsLoad && showPlacementRow(app) ? (
                <>
                  <button
                    type="button"
                    className="twin-link mt-2 text-xs font-medium"
                    onClick={() => {
                      void (async () => {
                        if (!onPlacementEventsLoad) return;
                        if (placementHistoryOpenId === app.id) {
                          setPlacementHistoryOpenId(null);
                          return;
                        }
                        setPlacementHistoryOpenId(app.id);
                        if (app.id in placementEventsByAppId) return;
                        setPlacementEventsLoadingId(app.id);
                        setPlacementEventsErrById((prev) => {
                          const next = { ...prev };
                          delete next[app.id];
                          return next;
                        });
                        try {
                          const rows = await onPlacementEventsLoad(app.id);
                          setPlacementEventsByAppId((prev) => ({ ...prev, [app.id]: rows }));
                        } catch (err) {
                          const msg = err instanceof Error ? err.message : String(err);
                          setPlacementEventsErrById((prev) => ({ ...prev, [app.id]: msg }));
                        } finally {
                          setPlacementEventsLoadingId((cur) => (cur === app.id ? null : cur));
                        }
                      })();
                    }}
                  >
                    {placementHistoryOpenId === app.id ? "− " : "+ "}
                    {t("dashboard.placementEventsToggle")}
                  </button>
                  {placementHistoryOpenId === app.id ? (
                    <div className="mt-2 max-w-2xl rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/40 p-3 text-xs">
                      {placementEventsLoadingId === app.id ? (
                        <p className="text-[var(--twin-muted)]">{t("dashboard.placementEventsLoading")}</p>
                      ) : placementEventsErrById[app.id] ? (
                        <p className="text-red-600 dark:text-red-400">{placementEventsErrById[app.id]}</p>
                      ) : (placementEventsByAppId[app.id] ?? []).length === 0 ? (
                        <p className="text-[var(--twin-muted)]">{t("dashboard.placementEventsEmpty")}</p>
                      ) : (
                        <ul className="space-y-3">
                          {(placementEventsByAppId[app.id] ?? []).map((ev) => (
                            <li
                              key={ev.id}
                              className="border-b border-[var(--twin-border)] pb-3 last:border-0 last:pb-0"
                            >
                              <p className="font-medium text-[var(--foreground)]">{ev.event_type}</p>
                              <p className="mt-0.5 text-[var(--twin-muted)]">
                                {new Date(ev.created_at).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </p>
                              <p className="mt-1 text-[var(--twin-muted-strong)]">
                                <span className="text-[var(--twin-muted)]">{t("dashboard.placementEventsActor")}: </span>
                                {ev.actor}
                              </p>
                              {ev.detail && Object.keys(ev.detail).length > 0 ? (
                                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--twin-input-bg)]/80 p-2 font-mono text-[10px] leading-relaxed text-[var(--twin-muted-strong)]">
                                  {t("dashboard.placementEventsDetail")}: {JSON.stringify(ev.detail, null, 2)}
                                </pre>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}
              {(onOptimizeCv || onNegotiateSalary) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {onOptimizeCv ? (
                    <button
                      type="button"
                      className="twin-btn-secondary twin-touch-target !w-auto px-3 py-1.5 text-xs"
                      onClick={() => onOptimizeCv(app.id, app.title)}
                    >
                      {t("careerAssistant.optimizeCv")}
                    </button>
                  ) : null}
                  {onNegotiateSalary &&
                  ["applied", "interview", "hired"].includes(app.status.trim().toLowerCase()) ? (
                    <button
                      type="button"
                      className="twin-btn-secondary twin-touch-target !w-auto px-3 py-1.5 text-xs"
                      onClick={() => onNegotiateSalary(app.id, app.title)}
                    >
                      {t("careerAssistant.negotiateSalary")}
                    </button>
                  ) : null}
                </div>
              )}
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
              {onOpenAutoApplyPackage && app.auto_apply_package_uploaded_at ? (
                <button
                  type="button"
                  disabled={packagePdfBusyId === app.id}
                  onClick={() => {
                    setPackagePdfBusyId(app.id);
                    void onOpenAutoApplyPackage(app.id).finally(() => setPackagePdfBusyId(null));
                  }}
                  className="text-xs text-[var(--twin-accent-hover)] hover:underline disabled:opacity-50"
                >
                  {packagePdfBusyId === app.id ? "…" : t("dashboard.autoApplyPackagePdf")}
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
    </>
  );
}
