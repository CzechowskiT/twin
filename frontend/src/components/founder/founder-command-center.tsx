"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useTranslation } from "@/components/language-provider";
import { getToken, hasActiveSession } from "@/lib/auth";

const API = "/api/founder-command";
const LOGIN_NEXT = "/login?next=%2Fadmin%2Ffounder-command";

type Links = Record<string, string>;

type Decision = {
  decision_id: string;
  operation?: string;
  risk?: string;
  title?: string;
  expires_at?: string | null;
};

type TimelineItem = {
  id: string;
  stage: string;
  message: string;
  created_at?: string | null;
};

type Command = {
  id: string;
  status: string;
  current_stage?: string | null;
  direction?: string;
  autonomy_level?: number;
  batch_index?: number;
  limits?: Record<string, number>;
  dispatch_run_id?: string | null;
  live_summary?: {
    headline?: string;
    gate_f?: string;
    launch?: string;
    counters?: Record<string, number>;
    links?: Links;
    cursor_agent_url?: string;
  } | null;
  final_summary?: {
    founder_facing?: string;
    counters_zero?: boolean;
    technical_details?: Record<string, unknown>;
  } | null;
  links?: Links;
  timeline?: TimelineItem[];
  pending_decisions?: Decision[];
  project_state?: {
    production?: Record<string, string>;
    counters?: Record<string, number>;
    gate_f?: { status?: string };
    launch?: { stance?: string };
  };
  error_message?: string | null;
};

type AuthGate = "checking" | "ready" | "redirect" | "forbidden";

async function readApiError(res: Response, fallback: string): Promise<string> {
  const raw = await res.text();
  if (!raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) return parsed.detail;
  } catch {
    /* plain text */
  }
  return raw.length > 400 ? `${raw.slice(0, 400)}…` : raw;
}

export function FounderCommandCenter() {
  const { t } = useTranslation();
  const router = useRouter();
  const [authGate, setAuthGate] = useState<AuthGate>("checking");
  const [direction, setDirection] = useState(
    "Wykonaj bezpieczny diagnostyczny batch i kontynuuj do pełnego PASS. Zachowaj Gate F PASS i Launch GO.",
  );
  const [autonomy, setAutonomy] = useState(3);
  const [maxBatches, setMaxBatches] = useState(3);
  const [maxRuntime, setMaxRuntime] = useState(120);
  const [command, setCommand] = useState<Command | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [techOpen, setTechOpen] = useState(false);

  const sessionHeaders = useCallback((): HeadersInit | null => {
    const token = getToken()?.trim();
    if (!token) return null;
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function gate() {
      if (!hasActiveSession()) {
        if (!cancelled) setAuthGate("redirect");
        router.replace(LOGIN_NEXT);
        return;
      }
      const headers = sessionHeaders();
      if (!headers) {
        if (!cancelled) setAuthGate("redirect");
        router.replace(LOGIN_NEXT);
        return;
      }
      try {
        const res = await fetch(`${API}/state`, { headers, cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) {
          setAuthGate("redirect");
          router.replace(LOGIN_NEXT);
          return;
        }
        if (res.status === 403) {
          setAuthGate("forbidden");
          return;
        }
        if (!res.ok) {
          setErr(await readApiError(res, t("founderCommand.errorGeneric")));
          setAuthGate("ready");
          return;
        }
        setAuthGate("ready");
      } catch {
        if (!cancelled) {
          setErr(t("founderCommand.errorGeneric"));
          setAuthGate("ready");
        }
      }
    }
    void gate();
    return () => {
      cancelled = true;
    };
  }, [router, sessionHeaders, t]);

  const refresh = useCallback(
    async (id?: string) => {
      const cid = id || command?.id;
      const headers = sessionHeaders();
      if (!cid || !headers) return;
      const res = await fetch(`${API}/commands/${cid}`, { headers, cache: "no-store" });
      if (res.status === 401) {
        router.replace(LOGIN_NEXT);
        return;
      }
      if (res.status === 403) {
        setAuthGate("forbidden");
        return;
      }
      if (!res.ok) throw new Error(await readApiError(res, t("founderCommand.errorGeneric")));
      setCommand((await res.json()) as Command);
    },
    [command?.id, router, sessionHeaders, t],
  );

  useEffect(() => {
    if (authGate !== "ready" || !command?.id) return;
    const timer = setInterval(() => {
      void refresh(command.id).catch(() => undefined);
    }, 8000);
    return () => clearInterval(timer);
  }, [authGate, command?.id, refresh]);

  async function mutate(path: string, body?: unknown) {
    setLoading(true);
    setErr(null);
    setSuccess(null);
    try {
      const headers = sessionHeaders();
      if (!headers) {
        router.replace(LOGIN_NEXT);
        return;
      }
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace(LOGIN_NEXT);
        return;
      }
      if (res.status === 403) {
        setAuthGate("forbidden");
        setErr(t("founderCommand.errorForbidden"));
        return;
      }
      if (!res.ok) {
        throw new Error(await readApiError(res, t("founderCommand.errorGeneric")));
      }
      const data = await res.json();
      const next = (data.command || data) as Command;
      if (next?.id) setCommand(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("founderCommand.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  async function start(action: "start" | "analyze") {
    setLoading(true);
    setErr(null);
    setSuccess(null);
    try {
      const headers = sessionHeaders();
      if (!headers) {
        router.replace(LOGIN_NEXT);
        return;
      }
      const res = await fetch(`${API}/commands`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Idempotency-Key": `ui-${action}-${Date.now()}`,
        },
        body: JSON.stringify({
          direction,
          action,
          autonomy_level: autonomy,
          max_batches: maxBatches,
          max_runtime_minutes: maxRuntime,
        }),
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace(LOGIN_NEXT);
        return;
      }
      if (res.status === 403) {
        setAuthGate("forbidden");
        setErr(t("founderCommand.errorForbidden"));
        return;
      }
      if (!res.ok) {
        throw new Error(await readApiError(res, t("founderCommand.errorGeneric")));
      }
      setCommand((await res.json()) as Command);
      setSuccess(t("founderCommand.successStarted"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("founderCommand.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  const links = command?.links || command?.live_summary?.links || {};
  const counters = command?.live_summary?.counters || command?.project_state?.counters || {};
  const busy = loading || authGate === "checking";

  if (authGate === "redirect" || authGate === "checking") {
    return (
      <div className="twin-shell twin-shell--wide py-10" data-fcc-auth={authGate}>
        <p className="text-base text-[var(--foreground)]" role="status">
          {authGate === "checking" ? t("founderCommand.sessionChecking") : t("founderCommand.redirectingLogin")}
        </p>
      </div>
    );
  }

  if (authGate === "forbidden") {
    return (
      <div className="twin-shell twin-shell--wide py-10" data-fcc-auth="forbidden">
        <h1 className="mb-2 text-2xl font-semibold text-[var(--foreground)]">{t("founderCommand.title")}</h1>
        <p className="text-base text-[var(--twin-danger,#b42318)]" role="alert">
          {t("founderCommand.forbidden")}
        </p>
      </div>
    );
  }

  return (
    <div className="twin-shell twin-shell--wide py-10" data-fcc-ready="1">
      <header className="mb-6">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          {t("founderCommand.title")}
        </h1>
        <p className="twin-muted mt-2 max-w-xl text-sm">{t("founderCommand.subtitle")}</p>
        <p className="mt-2 text-sm font-medium text-[var(--twin-accent)]" data-fcc-session="ready">
          {t("founderCommand.sessionReady")}
        </p>
      </header>

      <section className="mb-8 grid gap-4 border-t border-[color-mix(in_oklab,var(--foreground)_16%,transparent)] pt-6">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-[var(--foreground)]">{t("founderCommand.directionLabel")}</span>
          <textarea
            data-fcc-direction
            className="twin-input min-h-24 w-full resize-y"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            rows={4}
            placeholder={t("founderCommand.directionPlaceholder")}
          />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-[var(--foreground)]">{t("founderCommand.autonomyLabel")}</span>
            <select
              className="twin-input"
              value={autonomy}
              onChange={(e) => setAutonomy(Number(e.target.value))}
            >
              <option value={1}>{t("founderCommand.autonomy1")}</option>
              <option value={2}>{t("founderCommand.autonomy2")}</option>
              <option value={3}>{t("founderCommand.autonomy3")}</option>
              <option value={4}>{t("founderCommand.autonomy4")}</option>
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-[var(--foreground)]">{t("founderCommand.maxBatches")}</span>
            <input
              className="twin-input w-24"
              type="number"
              min={1}
              max={50}
              value={maxBatches}
              onChange={(e) => setMaxBatches(Number(e.target.value))}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-[var(--foreground)]">{t("founderCommand.maxRuntime")}</span>
            <input
              className="twin-input w-24"
              type="number"
              min={5}
              max={1440}
              value={maxRuntime}
              onChange={(e) => setMaxRuntime(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-fcc-start
            className="twin-btn-solid"
            disabled={busy || !direction.trim()}
            onClick={() => void start("start")}
          >
            {loading ? t("founderCommand.starting") : t("founderCommand.start")}
          </button>
          <button
            type="button"
            data-fcc-analyze
            className="twin-btn-secondary"
            disabled={busy || !direction.trim()}
            onClick={() => void start("analyze")}
          >
            {t("founderCommand.analyze")}
          </button>
          <button
            type="button"
            className="twin-btn-secondary"
            disabled={busy || !command?.id}
            onClick={() => void mutate(`/commands/${command!.id}/continue`)}
          >
            {t("founderCommand.continue")}
          </button>
          <button
            type="button"
            className="twin-btn-secondary"
            disabled={busy || !command?.id}
            onClick={() => void mutate(`/commands/${command!.id}/pause`)}
          >
            {t("founderCommand.pause")}
          </button>
          <button
            type="button"
            className="twin-btn-secondary"
            disabled={busy || !command?.id}
            onClick={() => void mutate(`/commands/${command!.id}/cancel`)}
          >
            {t("founderCommand.cancel")}
          </button>
          <button
            type="button"
            className="twin-btn-secondary"
            disabled={busy || !command?.id}
            onClick={() => void refresh()}
          >
            {t("founderCommand.refresh")}
          </button>
        </div>

        {loading ? (
          <p className="m-0 text-sm font-medium text-[var(--foreground)]" role="status" data-fcc-loading>
            {t("founderCommand.loading")}
          </p>
        ) : null}
        {success ? (
          <p className="m-0 text-sm font-medium text-[var(--twin-accent)]" role="status" data-fcc-success>
            {success}
          </p>
        ) : null}
        {err ? (
          <p className="m-0 text-sm font-medium text-[var(--twin-danger,#b42318)]" role="alert" data-fcc-error>
            <span className="font-semibold">{t("founderCommand.errorApi")}: </span>
            {err}
          </p>
        ) : null}
      </section>

      {!command ? (
        <p className="twin-muted text-sm">{t("founderCommand.noCommand")}</p>
      ) : (
        <div className="grid gap-6">
          <section className="border-t border-[color-mix(in_oklab,var(--foreground)_14%,transparent)] pt-4">
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{t("founderCommand.currentWork")}</h2>
            <dl className="m-0 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2 text-sm text-[var(--foreground)]">
              <dt className="font-semibold">{t("founderCommand.commandId")}</dt>
              <dd data-fcc-command-id>{command.id}</dd>
              <dt className="font-semibold">{t("founderCommand.status")}</dt>
              <dd data-fcc-status>{command.status}</dd>
              <dt className="font-semibold">{t("founderCommand.stage")}</dt>
              <dd>{command.current_stage || "—"}</dd>
              <dt className="font-semibold">{t("founderCommand.batch")}</dt>
              <dd>
                {(command.batch_index ?? 0) + 1}/{command.limits?.max_batches ?? "?"}
              </dd>
              <dt className="font-semibold">{t("founderCommand.gateF")}</dt>
              <dd>{command.live_summary?.gate_f || command.project_state?.gate_f?.status || "PASS"}</dd>
              <dt className="font-semibold">{t("founderCommand.launch")}</dt>
              <dd>{command.live_summary?.launch || command.project_state?.launch?.stance || "GO"}</dd>
            </dl>
            <p className="mt-3 text-[var(--foreground)]">{command.live_summary?.headline || command.direction}</p>
            {command.error_message ? (
              <p className="mt-2 text-sm text-[var(--twin-danger,#b42318)]">{command.error_message}</p>
            ) : null}
          </section>

          {(command.pending_decisions?.length ?? 0) > 0 ? (
            <section className="border-t border-[color-mix(in_oklab,var(--foreground)_14%,transparent)] pt-4">
              <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{t("founderCommand.decisionCard")}</h2>
              <ul className="m-0 grid list-none gap-3 p-0">
                {command.pending_decisions!.map((d) => (
                  <li key={d.decision_id} className="border-l-[3px] border-amber-700 pl-3">
                    <strong className="text-[var(--foreground)]">{d.title}</strong>
                    <div className="twin-muted text-sm">
                      {d.operation} · {d.risk}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="twin-btn-solid"
                        onClick={() => void mutate(`/commands/${command.id}/approve`, { approve: true })}
                      >
                        {t("founderCommand.approve")}
                      </button>
                      <button
                        type="button"
                        className="twin-btn-secondary"
                        onClick={() => void mutate(`/commands/${command.id}/approve`, { approve: false })}
                      >
                        {t("founderCommand.reject")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="border-t border-[color-mix(in_oklab,var(--foreground)_14%,transparent)] pt-4">
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{t("founderCommand.links")}</h2>
            <ul className="m-0 pl-5 text-[var(--foreground)]" data-fcc-links>
              {links.cursor_agent ? (
                <li>
                  <a
                    className="twin-link"
                    href={links.cursor_agent}
                    target="_blank"
                    rel="noreferrer"
                    data-fcc-cursor-url
                  >
                    {t("founderCommand.cursorAgent")}
                  </a>
                </li>
              ) : null}
              {links.pull_request ? (
                <li>
                  <a className="twin-link" href={links.pull_request} target="_blank" rel="noreferrer">
                    {t("founderCommand.pullRequest")}
                  </a>
                </li>
              ) : null}
              {command.dispatch_run_id ? (
                <li data-fcc-dispatch-run>
                  {t("founderCommand.dispatchRun")}: {command.dispatch_run_id}
                </li>
              ) : null}
              {Object.entries(links)
                .filter(([k]) => !["cursor_agent", "pull_request", "dispatch_run", "founder_command"].includes(k))
                .map(([k, v]) => (
                  <li key={k}>
                    <a className="twin-link" href={v} target="_blank" rel="noreferrer">
                      {k}
                    </a>
                  </li>
                ))}
            </ul>
          </section>

          <section className="border-t border-[color-mix(in_oklab,var(--foreground)_14%,transparent)] pt-4">
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{t("founderCommand.counters")}</h2>
            <pre className="mt-2 overflow-auto rounded-md bg-[color-mix(in_oklab,var(--foreground)_8%,var(--background))] p-3 text-xs text-[var(--foreground)]">
              {JSON.stringify(counters, null, 2)}
            </pre>
          </section>

          <section className="border-t border-[color-mix(in_oklab,var(--foreground)_14%,transparent)] pt-4">
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{t("founderCommand.timeline")}</h2>
            <ol className="m-0 pl-5 text-[var(--foreground)]">
              {(command.timeline || []).map((item) => (
                <li key={item.id} className="mb-2">
                  <strong>{item.stage}</strong> — {item.message}
                  {item.created_at ? <span className="twin-muted text-xs"> · {item.created_at}</span> : null}
                </li>
              ))}
            </ol>
          </section>

          {command.final_summary ? (
            <section className="border-t border-[color-mix(in_oklab,var(--foreground)_14%,transparent)] pt-4">
              <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{t("founderCommand.finalSummary")}</h2>
              <p className="text-[var(--foreground)]">{command.final_summary.founder_facing}</p>
              <p className="text-sm text-[var(--foreground)]">
                counters_zero: {String(command.final_summary.counters_zero)}
              </p>
              <button type="button" className="twin-btn-secondary" onClick={() => setTechOpen((v) => !v)}>
                {t("founderCommand.technicalDetails")}
              </button>
              {techOpen ? (
                <pre className="mt-2 overflow-auto rounded-md bg-[color-mix(in_oklab,var(--foreground)_8%,var(--background))] p-3 text-xs text-[var(--foreground)]">
                  {JSON.stringify(command.final_summary.technical_details, null, 2)}
                </pre>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
