"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type PathOption = {
  path_kind: string;
  path_state: string;
  selectable_object_count: number;
  objects: { object_ref: string; label: string }[];
  editor_route: string;
};

type Requirement = {
  requirement_key: string;
  status: string;
  required: boolean;
  explanation: string;
  deep_link: string;
};

type EvalOut = {
  session_key?: string;
  path_kind?: string;
  path_state?: string;
  requirements?: Requirement[];
  resolution_routes?: {
    deep_link: string;
    explanation: string;
    data_trust_handoff?: boolean;
  }[];
  first_value_satisfied?: boolean;
};

const PATH_LABEL_KEYS: Record<string, string> = {
  EVALUATE_ONE_OPPORTUNITY: "pathReadiness.pathEvaluateOpp",
  PREPARE_ONE_APPLICATION: "pathReadiness.pathPrepareApp",
  PREPARE_ONE_INTERVIEW: "pathReadiness.pathPrepareInterview",
  REVIEW_ONE_CAREER_DECISION: "pathReadiness.pathReviewDecision",
  MOVE_ONE_APPROVED_DECISION_TO_EXECUTION: "pathReadiness.pathMoveExecution",
};

export function PathReadinessPanel() {
  const { t } = useTranslation();
  const [paths, setPaths] = useState<PathOption[]>([]);
  const [selectedKind, setSelectedKind] = useState<string>("");
  const [selectedRef, setSelectedRef] = useState<string>("");
  const [evalOut, setEvalOut] = useState<EvalOut | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<{ paths?: PathOption[] }>(
        "/api/v1/candidates/me/path-readiness/options",
        {},
        token,
      );
      setPaths(data.paths || []);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("pathReadiness.error"));
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const current = paths.find((p) => p.path_kind === selectedKind);

  async function select() {
    if (!selectedKind) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const data = await apiFetch<EvalOut>(
        "/api/v1/candidates/me/path-readiness/select",
        {
          method: "POST",
          body: JSON.stringify({
            path_kind: selectedKind,
            object_ref: selectedRef || null,
          }),
        },
        token,
      );
      setEvalOut(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("pathReadiness.error"));
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!evalOut?.session_key) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const data = await apiFetch<EvalOut>(
        `/api/v1/candidates/me/path-readiness/sessions/${encodeURIComponent(evalOut.session_key)}`,
        {},
        token,
      );
      setEvalOut(data);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("pathReadiness.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onRouteClick(deepLink: string) {
    if (!evalOut?.session_key) return;
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch(
        `/api/v1/candidates/me/path-readiness/sessions/${encodeURIComponent(evalOut.session_key)}/route-click`,
        { method: "POST", body: JSON.stringify({ deep_link: deepLink }) },
        token,
      );
    } catch {
      /* non-blocking telemetry */
    }
  }

  async function clearSel() {
    if (!evalOut?.session_key) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/candidates/me/path-readiness/sessions/${encodeURIComponent(evalOut.session_key)}/clear`,
        { method: "POST" },
        token,
      );
      setEvalOut(null);
      setSelectedRef("");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("pathReadiness.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card data-path-readiness-panel>
      <h2 className="text-lg font-medium">{t("pathReadiness.title")}</h2>
      <p className="mt-1 text-sm text-[var(--twin-muted)]">{t("pathReadiness.lead")}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--twin-muted)]">
        <li>{t("pathReadiness.markerNoBest")}</li>
        <li>{t("pathReadiness.markerNoScores")}</li>
        <li>{t("pathReadiness.markerClicks")}</li>
      </ul>
      {err ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {err}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {paths.map((p) => {
          const labelKey = PATH_LABEL_KEYS[p.path_kind] || "pathReadiness.nav";
          return (
            <Button
              key={p.path_kind}
              type="button"
              disabled={busy}
              onClick={() => {
                setSelectedKind(p.path_kind);
                setSelectedRef("");
              }}
            >
              {t(labelKey as "pathReadiness.nav")} ({p.path_state})
            </Button>
          );
        })}
      </div>
      {current ? (
        <div className="mt-3 space-y-2 text-sm">
          {current.selectable_object_count === 0 ? (
            <p>
              {t("pathReadiness.emptyStartable")}{" "}
              <Link className="twin-link" href={current.editor_route}>
                {t("pathReadiness.openRoute")}
              </Link>
            </p>
          ) : (
            <label className="block">
              <span className="text-xs">{t("pathReadiness.selectObject")}</span>
              <select
                className="mt-1 w-full rounded border border-[var(--twin-border)] bg-transparent px-2 py-1"
                value={selectedRef}
                onChange={(e) => setSelectedRef(e.target.value)}
              >
                <option value="">—</option>
                {current.objects.map((o) => (
                  <option key={o.object_ref} value={o.object_ref}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void select()}>
              {t("pathReadiness.selectPath")}
            </Button>
            <Button type="button" disabled={busy || !evalOut} onClick={() => void refresh()}>
              {t("pathReadiness.evaluate")}
            </Button>
            <Button type="button" disabled={busy || !evalOut} onClick={() => void clearSel()}>
              {t("pathReadiness.clear")}
            </Button>
          </div>
        </div>
      ) : null}
      {evalOut ? (
        <div className="mt-4 text-sm">
          <p>
            {t("pathReadiness.pathState")}: <strong>{evalOut.path_state}</strong>
          </p>
          <h3 className="mt-2 font-medium">{t("pathReadiness.blockers")}</h3>
          <ul className="mt-1 space-y-2">
            {(evalOut.resolution_routes || []).map((r) => (
              <li key={`${r.deep_link}-${r.explanation.slice(0, 24)}`}>
                <p>{r.explanation}</p>
                {r.data_trust_handoff ? (
                  <p className="text-xs text-[var(--twin-muted)]">
                    {t("pathReadiness.dataTrustHandoff")}
                  </p>
                ) : null}
                <Link
                  className="twin-link"
                  href={r.deep_link}
                  onClick={() => void onRouteClick(r.deep_link)}
                >
                  {t("pathReadiness.openRoute")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {busy ? <p className="mt-2 text-xs">{t("pathReadiness.loading")}</p> : null}
    </Card>
  );
}
