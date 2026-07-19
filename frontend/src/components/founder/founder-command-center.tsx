"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "@/components/language-provider";

const STORAGE_KEY = "twin_founder_command_token";
const API = "/api/v1/founder-command";

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

export function FounderCommandCenter() {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [csrf, setCsrf] = useState("");
  const [direction, setDirection] = useState(
    "Wykonaj bezpieczny diagnostyczny batch i kontynuuj do pełnego PASS. Zachowaj Gate F PASS i Launch GO.",
  );
  const [autonomy, setAutonomy] = useState(3);
  const [maxBatches, setMaxBatches] = useState(3);
  const [maxRuntime, setMaxRuntime] = useState(120);
  const [command, setCommand] = useState<Command | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [techOpen, setTechOpen] = useState(false);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) queueMicrotask(() => setToken(s));
    } catch {
      /* ignore */
    }
  }, []);

  const headers = useCallback(
    (mutating = false): HeadersInit => {
      const h: Record<string, string> = {
        Authorization: `Bearer ${token.trim()}`,
        Accept: "application/json",
      };
      if (mutating) {
        h["Content-Type"] = "application/json";
        if (csrf) h["X-CSRF-Token"] = csrf;
      }
      return h;
    },
    [token, csrf],
  );

  const ensureCsrf = useCallback(async () => {
    const res = await fetch(`${API}/csrf`, { headers: headers(false), cache: "no-store" });
    if (!res.ok) throw new Error(t("founderCommand.errorAuth"));
    const data = (await res.json()) as { csrf_token: string };
    setCsrf(data.csrf_token);
    return data.csrf_token;
  }, [headers, t]);

  const refresh = useCallback(
    async (id?: string) => {
      const cid = id || command?.id;
      if (!cid || !token.trim()) return;
      const res = await fetch(`${API}/commands/${cid}`, {
        headers: headers(false),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      setCommand((await res.json()) as Command);
    },
    [command?.id, headers, token],
  );

  useEffect(() => {
    if (!command?.id || !token.trim()) return;
    const timer = setInterval(() => {
      void refresh(command.id).catch(() => undefined);
    }, 8000);
    return () => clearInterval(timer);
  }, [command?.id, refresh, token]);

  async function mutate(path: string, body?: unknown) {
    setLoading(true);
    setErr(null);
    try {
      sessionStorage.setItem(STORAGE_KEY, token.trim());
      let csrfToken = csrf;
      if (!csrfToken) csrfToken = await ensureCsrf();
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: {
          ...headers(true),
          "X-CSRF-Token": csrfToken,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new Error(t("founderCommand.errorAuth"));
        throw new Error((await res.text()) || t("founderCommand.errorGeneric"));
      }
      const data = await res.json();
      const next = (data.command || data) as Command;
      if (next?.id) setCommand(next);
      await ensureCsrf();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("founderCommand.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  async function start(action: "start" | "analyze") {
    setLoading(true);
    setErr(null);
    try {
      sessionStorage.setItem(STORAGE_KEY, token.trim());
      const csrfToken = await ensureCsrf();
      const res = await fetch(`${API}/commands`, {
        method: "POST",
        headers: {
          ...headers(true),
          "X-CSRF-Token": csrfToken,
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
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new Error(t("founderCommand.errorAuth"));
        throw new Error((await res.text()) || t("founderCommand.errorGeneric"));
      }
      setCommand((await res.json()) as Command);
      await ensureCsrf();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("founderCommand.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  const links = command?.links || command?.live_summary?.links || {};
  const counters = command?.live_summary?.counters || command?.project_state?.counters || {};

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "1.5rem 1rem 3rem",
        fontFamily: "var(--font-sans, ui-sans-serif, system-ui)",
        color: "var(--fg, #12141a)",
      }}
    >
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 650, margin: 0 }}>{t("founderCommand.title")}</h1>
        <p style={{ margin: "0.4rem 0 0", opacity: 0.8, maxWidth: "36rem" }}>{t("founderCommand.subtitle")}</p>
      </header>

      <section
        style={{
          display: "grid",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          borderTop: "1px solid color-mix(in oklab, currentColor 18%, transparent)",
          paddingTop: "1rem",
        }}
      >
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t("founderCommand.tokenLabel")}</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            style={inputStyle}
          />
          <span style={{ fontSize: 12, opacity: 0.7 }}>{t("founderCommand.tokenHint")}</span>
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t("founderCommand.directionLabel")}</span>
          <textarea
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            rows={4}
            placeholder={t("founderCommand.directionPlaceholder")}
            style={{ ...inputStyle, resize: "vertical", minHeight: 96 }}
          />
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t("founderCommand.autonomyLabel")}</span>
            <select value={autonomy} onChange={(e) => setAutonomy(Number(e.target.value))} style={inputStyle}>
              <option value={1}>{t("founderCommand.autonomy1")}</option>
              <option value={2}>{t("founderCommand.autonomy2")}</option>
              <option value={3}>{t("founderCommand.autonomy3")}</option>
              <option value={4}>{t("founderCommand.autonomy4")}</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t("founderCommand.maxBatches")}</span>
            <input
              type="number"
              min={1}
              max={50}
              value={maxBatches}
              onChange={(e) => setMaxBatches(Number(e.target.value))}
              style={{ ...inputStyle, width: 96 }}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t("founderCommand.maxRuntime")}</span>
            <input
              type="number"
              min={5}
              max={1440}
              value={maxRuntime}
              onChange={(e) => setMaxRuntime(Number(e.target.value))}
              style={{ ...inputStyle, width: 96 }}
            />
          </label>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" disabled={loading || !token.trim()} onClick={() => void start("start")} style={btnPrimary}>
            {t("founderCommand.start")}
          </button>
          <button type="button" disabled={loading || !token.trim()} onClick={() => void start("analyze")} style={btn}>
            {t("founderCommand.analyze")}
          </button>
          <button
            type="button"
            disabled={loading || !command?.id}
            onClick={() => void mutate(`/commands/${command!.id}/continue`)}
            style={btn}
          >
            {t("founderCommand.continue")}
          </button>
          <button
            type="button"
            disabled={loading || !command?.id}
            onClick={() => void mutate(`/commands/${command!.id}/pause`)}
            style={btn}
          >
            {t("founderCommand.pause")}
          </button>
          <button
            type="button"
            disabled={loading || !command?.id}
            onClick={() => void mutate(`/commands/${command!.id}/cancel`)}
            style={btn}
          >
            {t("founderCommand.cancel")}
          </button>
          <button
            type="button"
            disabled={loading || !command?.id}
            onClick={() => void refresh()}
            style={btn}
          >
            {t("founderCommand.refresh")}
          </button>
        </div>
        {err ? <p style={{ color: "#b42318", margin: 0 }}>{err}</p> : null}
        {csrf ? <p style={{ fontSize: 12, opacity: 0.65, margin: 0 }}>{t("founderCommand.csrfReady")}</p> : null}
      </section>

      {!command ? (
        <p style={{ opacity: 0.75 }}>{t("founderCommand.noCommand")}</p>
      ) : (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <section style={panel}>
            <h2 style={h2}>{t("founderCommand.currentWork")}</h2>
            <dl style={dl}>
              <dt>{t("founderCommand.status")}</dt>
              <dd>{command.status}</dd>
              <dt>{t("founderCommand.stage")}</dt>
              <dd>{command.current_stage || "—"}</dd>
              <dt>{t("founderCommand.batch")}</dt>
              <dd>
                {(command.batch_index ?? 0) + 1}/{command.limits?.max_batches ?? "?"}
              </dd>
              <dt>{t("founderCommand.gateF")}</dt>
              <dd>{command.live_summary?.gate_f || command.project_state?.gate_f?.status || "PASS"}</dd>
              <dt>{t("founderCommand.launch")}</dt>
              <dd>{command.live_summary?.launch || command.project_state?.launch?.stance || "GO"}</dd>
            </dl>
            <p style={{ margin: "0.75rem 0 0" }}>{command.live_summary?.headline || command.direction}</p>
            {command.error_message ? (
              <p style={{ color: "#b42318", marginTop: 8 }}>{command.error_message}</p>
            ) : null}
          </section>

          {(command.pending_decisions?.length ?? 0) > 0 ? (
            <section style={panel}>
              <h2 style={h2}>{t("founderCommand.decisionCard")}</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
                {command.pending_decisions!.map((d) => (
                  <li key={d.decision_id} style={{ borderLeft: "3px solid #b45309", paddingLeft: 12 }}>
                    <strong>{d.title}</strong>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {d.operation} · {d.risk}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        style={btnPrimary}
                        onClick={() =>
                          void mutate(`/commands/${command.id}/approve`, { approve: true })
                        }
                      >
                        {t("founderCommand.approve")}
                      </button>
                      <button
                        type="button"
                        style={btn}
                        onClick={() =>
                          void mutate(`/commands/${command.id}/approve`, { approve: false })
                        }
                      >
                        {t("founderCommand.reject")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section style={panel}>
            <h2 style={h2}>{t("founderCommand.links")}</h2>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {links.cursor_agent ? (
                <li>
                  <a href={links.cursor_agent} target="_blank" rel="noreferrer">
                    {t("founderCommand.cursorAgent")}
                  </a>
                </li>
              ) : null}
              {links.pull_request ? (
                <li>
                  <a href={links.pull_request} target="_blank" rel="noreferrer">
                    {t("founderCommand.pullRequest")}
                  </a>
                </li>
              ) : null}
              {command.dispatch_run_id ? (
                <li>
                  <span>
                    {t("founderCommand.dispatchRun")}: {command.dispatch_run_id}
                  </span>
                </li>
              ) : null}
              {Object.entries(links)
                .filter(([k]) => !["cursor_agent", "pull_request", "dispatch_run", "founder_command"].includes(k))
                .map(([k, v]) => (
                  <li key={k}>
                    <a href={v} target="_blank" rel="noreferrer">
                      {k}
                    </a>
                  </li>
                ))}
            </ul>
          </section>

          <section style={panel}>
            <h2 style={h2}>{t("founderCommand.counters")}</h2>
            <pre style={pre}>{JSON.stringify(counters, null, 2)}</pre>
          </section>

          <section style={panel}>
            <h2 style={h2}>{t("founderCommand.timeline")}</h2>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {(command.timeline || []).map((item) => (
                <li key={item.id} style={{ marginBottom: 8 }}>
                  <strong>{item.stage}</strong> — {item.message}
                  {item.created_at ? (
                    <span style={{ opacity: 0.65, fontSize: 12 }}> · {item.created_at}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          {command.final_summary ? (
            <section style={panel}>
              <h2 style={h2}>{t("founderCommand.finalSummary")}</h2>
              <p>{command.final_summary.founder_facing}</p>
              <p style={{ fontSize: 13 }}>
                counters_zero: {String(command.final_summary.counters_zero)}
              </p>
              <button type="button" style={btn} onClick={() => setTechOpen((v) => !v)}>
                {t("founderCommand.technicalDetails")}
              </button>
              {techOpen ? (
                <pre style={pre}>{JSON.stringify(command.final_summary.technical_details, null, 2)}</pre>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}

const inputStyle: CSSProperties = {
  padding: "0.55rem 0.65rem",
  border: "1px solid color-mix(in oklab, currentColor 22%, transparent)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  fontSize: 14,
};

const btn: CSSProperties = {
  padding: "0.45rem 0.8rem",
  borderRadius: 6,
  border: "1px solid color-mix(in oklab, currentColor 25%, transparent)",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  fontSize: 14,
};

const btnPrimary: CSSProperties = {
  ...btn,
  background: "#12141a",
  color: "#f5f5f4",
  borderColor: "#12141a",
};

const panel: CSSProperties = {
  borderTop: "1px solid color-mix(in oklab, currentColor 14%, transparent)",
  paddingTop: "0.85rem",
};

const h2: CSSProperties = {
  fontSize: "1.05rem",
  margin: "0 0 0.65rem",
  fontWeight: 650,
};

const dl: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "8rem 1fr",
  gap: "0.35rem 0.75rem",
  margin: 0,
  fontSize: 14,
};

const pre: CSSProperties = {
  margin: "0.5rem 0 0",
  padding: "0.65rem",
  overflow: "auto",
  fontSize: 12,
  background: "color-mix(in oklab, currentColor 6%, transparent)",
  borderRadius: 6,
};
