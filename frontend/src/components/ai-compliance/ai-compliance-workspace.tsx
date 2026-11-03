"use client";

import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";

type Props = {
  persona: "candidate" | "recruiter" | "company" | "board";
  title: string;
  subtitle: string;
};

type ClaimRow = {
  claim_id: string;
  claim_key: string;
  claim_value: string;
  status: string;
  display_provenance?: string;
};

const API = "/api/v1/platform/ai-compliance";

async function apiGet(path: string, token: string) {
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function apiPost(path: string, token: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

export function AiComplianceWorkspace({ persona, title, subtitle }: Props) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [skill, setSkill] = useState("Python");

  useEffect(() => {
    setToken(getToken() || "");
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    const st = await apiGet(`${API}/status`, token);
    if (st.status === 200) setStatus(st.body);
    const cl = await apiGet(`${API}/claims`, token);
    if (cl.status === 200) setClaims((cl.body?.items as ClaimRow[]) || []);
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createDeclared() {
    setMessage(null);
    const res = await apiPost(`${API}/claims`, token, {
      subject_type: "candidate",
      subject_id: `ui-${persona}`,
      claim_type: "skill",
      claim_key: skill.toLowerCase(),
      claim_value: skill,
      status: "DECLARED",
      source_type: "self_declaration",
      actor_type: "human",
    });
    setMessage(res.status === 201 ? `Created ${res.body.claim_id} as ${res.body.status}` : `Error ${res.status}`);
    await refresh();
  }

  return (
    <main style={{ maxWidth: 920, margin: "2rem auto", padding: "0 1rem", fontFamily: "Georgia, serif" }}>
      <p style={{ letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.7 }}>{persona}</p>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.35rem" }}>{title}</h1>
      <p style={{ opacity: 0.8, marginBottom: "1.5rem" }}>{subtitle}</p>
      <p style={{ marginBottom: "1rem" }}>
        Provenance is shown as claim status — never a single &quot;verified&quot; badge. AI_INFERRED stays visibly non-verified.
      </p>
      {status ? (
        <section style={{ marginBottom: "1.5rem", padding: "1rem", background: "linear-gradient(135deg,#f7f3ea,#eef2f6)" }}>
          <strong>Compliance readiness</strong>
          <div>Live claim: {String(status.live_claim)}</div>
          <div>Wave 4: {String(status.wave4)} · Wave 6: {String(status.wave6)}</div>
          <div>Autonomous employment: {String(status.ai_autonomous_employment_decisions)}</div>
          <div>External verification: {String(status.ai_external_verification_enabled)}</div>
        </section>
      ) : null}
      {(persona === "candidate" || persona === "recruiter") && (
        <section style={{ marginBottom: "1.5rem" }}>
          <label>
            Declared skill claim{" "}
            <input value={skill} onChange={(e) => setSkill(e.target.value)} />
          </label>{" "}
          <button type="button" onClick={() => void createDeclared()}>
            Create DECLARED claim
          </button>
        </section>
      )}
      {message ? <p>{message}</p> : null}
      <section>
        <h2>Claims</h2>
        <ul>
          {claims.map((c) => (
            <li key={c.claim_id}>
              <code>{c.claim_id}</code> · {c.claim_key}={c.claim_value} ·{" "}
              <strong>{c.display_provenance || c.status}</strong>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
