"use client";

/**
 * Founder / ops Pilot OS console — real data only via ops Bearer.
 * Intake + approve + prepare pack; send only with explicit Founder ref.
 * Never invent orgs; never auto-send. Mask recipient emails.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "twin_ops_admin_token";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://twin-production-bcd9.up.railway.app";

type FirstCustomer = {
  first_customer_verdict?: string;
  pilot_health_score?: number;
  launch_go_readiness_score?: number;
  launch_decision?: string;
  kpi_token?: string;
  open_support_tickets?: number;
  open_feedback_items?: number;
};

type Org = {
  id: number;
  slug: string;
  display_name: string;
  legal_name?: string | null;
  sponsor_label?: string | null;
  approval_status?: string;
  is_synthetic?: boolean;
  recipients_masked?: string[];
  founder_org_approval_ref?: string | null;
};

type Pack = {
  id: number;
  organization_id: number;
  status: string;
  sent_at?: string | null;
};

type Activation = {
  outcome?: string;
  missing_inputs?: string[];
  intake_required_fields?: string[];
  approved_real_orgs?: number;
  packs_ready_unsent?: number;
  packs_sent?: number;
  evidence_tier?: string;
  kpi_token?: string;
};

type AiRealValidation = {
  verdict?: string;
  evidence_tier?: string;
  approval_search?: { result?: string; approved_count?: number };
  scores?: Record<string, number | string>;
  kpi?: {
    token?: string;
    real_pilot_data_started?: boolean;
    real_customer_validated?: boolean;
    synthetic_excluded?: boolean;
  };
  next_action?: string;
  cvs_processed?: number;
  analyses_completed?: number;
  corrections?: number;
  overrides?: number;
  evidence_views?: number;
  feedback?: number;
  support_incidents_open?: number;
  unsupported_claims?: number;
  protected_attribute_violations?: number;
  packs_ready_unsent?: number;
  packs_sent?: number;
  production_safety_gate?: { pass?: boolean; blockers?: string[] };
};

type OsStatus = {
  verdict?: string;
  kpi_token?: string;
  canonical_url?: string;
  next_founder_action?: string;
  first_customer?: FirstCustomer;
  stance?: Record<string, string | boolean>;
  organizations?: Org[];
  founder_approved_real_orgs?: Org[];
  invitation_packs?: Pack[];
  support_open_tickets?: number;
  activation?: Activation;
  launch_go_gate?: { launch_decision?: string; reason?: string; counts?: Record<string, number> };
  customer_usable?: {
    customer_usable_pass?: number;
    hard_live_core_pass_technical?: number;
    hard_live_is_technical_only?: boolean;
    minimal_journey_id?: string;
    multi_role_journey_id?: string;
    verdict?: string;
  };
  ai_real_validation?: AiRealValidation;
};

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token.trim()}`,
    "Content-Type": "application/json",
  };
}

export default function AdminPilotOsPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<OsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [recipients, setRecipients] = useState("");
  const [approveOrgId, setApproveOrgId] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [orgApprovalRef, setOrgApprovalRef] = useState("");
  const [packOrgId, setPackOrgId] = useState("");
  const [sendPackId, setSendPackId] = useState("");
  const [sendRef, setSendRef] = useState("");
  const [sendGate, setSendGate] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    try {
      setToken(sessionStorage.getItem(STORAGE_KEY) || "");
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    if (!token.trim()) {
      setError("Paste ops admin token (stored only in sessionStorage).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      sessionStorage.setItem(STORAGE_KEY, token.trim());
      const res = await fetch(`${API}/api/v1/admin/pilot-os/status`, {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus((await res.json()) as OsStatus);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setBusy(false);
    }
  }, [token]);

  async function postJson(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
      setMsg("OK — refresh status");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function checkSendSafety() {
    if (!sendPackId.trim()) {
      setError("Pack id required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `${API}/api/v1/admin/pilot-os/invitation-packs/${sendPackId.trim()}/send-safety`,
        { headers: authHeaders(token) },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSendGate((await res.json()) as Record<string, unknown>);
    } catch (e) {
      setSendGate(null);
      setError(e instanceof Error ? e.message : "send-safety failed");
    } finally {
      setBusy(false);
    }
  }

  const fc = status?.first_customer;
  const approved = status?.founder_approved_real_orgs?.length ?? 0;
  const missing = status?.activation?.missing_inputs ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-neutral-500">
        <Link href="/admin/metrics">← Metrics</Link> ·{" "}
        <Link href="/admin/cohorts">Cohorts</Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Pilot OS — first real org</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Founder intake only. Launch stays NO-GO. Do not invent customers. Send never auto-runs.
      </p>

      <label className="mt-6 block text-sm font-medium">Ops Bearer token</label>
      <input
        className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        type="password"
        autoComplete="off"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="OPS_ADMIN_TOKEN"
      />
      <button
        type="button"
        className="mt-3 rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        disabled={busy}
        onClick={() => void load()}
      >
        {busy ? "Loading…" : "Refresh status"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {msg ? <p className="mt-3 text-sm text-green-800">{msg}</p> : null}

      {status ? (
        <section className="mt-8 space-y-4 text-sm">
          <div className="rounded border border-neutral-200 p-4">
            <h2 className="font-medium">Verdict</h2>
            <p className="mt-1">{status.verdict || fc?.first_customer_verdict}</p>
            <p className="mt-2 text-neutral-600">Next: {status.next_founder_action}</p>
            <p className="mt-1 text-xs text-neutral-500">
              Evidence: {status.activation?.evidence_tier || "—"} · KPI{" "}
              {status.kpi_token || status.activation?.kpi_token}
            </p>
            {missing.length > 0 ? (
              <ul className="mt-2 list-inside list-disc text-amber-900">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : null}
          </div>

          {status.ai_real_validation ? (
            <div
              className="rounded border border-emerald-200 bg-emerald-50/30 p-4"
              data-testid="pilot-os-ai-validation-command"
            >
              <h2 className="font-medium">AI Candidate Intelligence — real validation</h2>
              <p className="mt-1 text-sm">{status.ai_real_validation.verdict}</p>
              <p className="mt-1 text-xs text-neutral-600">
                Tier: {status.ai_real_validation.evidence_tier} · Approval:{" "}
                {status.ai_real_validation.approval_search?.result || "—"}
              </p>
              <p className="mt-2 text-sm text-neutral-700">
                Next: {status.ai_real_validation.next_action}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-neutral-500">CVs processed</dt>
                  <dd className="font-semibold">{status.ai_real_validation.cvs_processed ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Corrections</dt>
                  <dd className="font-semibold">{status.ai_real_validation.corrections ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Feedback</dt>
                  <dd className="font-semibold">{status.ai_real_validation.feedback ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">AI support open</dt>
                  <dd className="font-semibold">
                    {status.ai_real_validation.support_incidents_open ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Real adoption score</dt>
                  <dd className="font-semibold">
                    {status.ai_real_validation.scores?.AI_REAL_USER_ADOPTION_SCORE ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Real value score</dt>
                  <dd className="font-semibold">
                    {status.ai_real_validation.scores?.AI_REAL_CUSTOMER_VALUE_SCORE ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Protected-attr violations</dt>
                  <dd className="font-semibold">
                    {status.ai_real_validation.protected_attribute_violations ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Unsupported claims</dt>
                  <dd className="font-semibold">
                    {status.ai_real_validation.unsupported_claims ?? 0}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-neutral-500">
                KPI {status.ai_real_validation.kpi?.token} · synthetic excluded:{" "}
                {String(status.ai_real_validation.kpi?.synthetic_excluded)} · safety:{" "}
                {status.ai_real_validation.production_safety_gate?.pass ? "PASS" : "BLOCK"}
              </p>
              <p className="mt-1 text-[11px] text-neutral-500">
                Launch stays NO-GO. Real scores stay 0 until Founder-approved non-synthetic activity.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-neutral-500">Pilot health</p>
              <p className="text-2xl font-semibold">{fc?.pilot_health_score ?? "—"}</p>
            </div>
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-neutral-500">Launch GO readiness</p>
              <p className="text-2xl font-semibold">{fc?.launch_go_readiness_score ?? 0}</p>
              <p className="text-xs text-neutral-500">Decision: {fc?.launch_decision || "NO-GO"}</p>
            </div>
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-neutral-500">Approved real orgs</p>
              <p className="text-2xl font-semibold">{approved}</p>
            </div>
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-neutral-500">Packs ready / sent</p>
              <p className="text-2xl font-semibold">
                {status.activation?.packs_ready_unsent ?? 0} / {status.activation?.packs_sent ?? 0}
              </p>
            </div>
          </div>

          <div className="rounded border border-neutral-200 p-4">
            <h2 className="font-medium">Organizations (masked)</h2>
            {(status.organizations || []).length === 0 ? (
              <p className="mt-2 text-neutral-600">None — create a candidate below.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {(status.organizations || []).map((o) => (
                  <li key={o.id} className="border-t border-neutral-100 pt-2">
                    <span className="font-medium">
                      #{o.id} {o.slug}
                    </span>{" "}
                    — {o.approval_status}
                    {o.is_synthetic ? " · SYNTHETIC (not real)" : ""}
                    <br />
                    <span className="text-xs text-neutral-500">
                      {(o.recipients_masked || []).join(", ") || "no recipients"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded border border-amber-200 bg-amber-50/40 p-4">
            <h2 className="font-medium">1. Create organization candidate</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Does not approve. Slugs nova-hiring-pl / demo-company / twin-demo are synthetic.
            </p>
            <div className="mt-3 grid gap-2">
              <input
                className="rounded border px-2 py-1"
                placeholder="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="legal_name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="sponsor_label"
                value={sponsor}
                onChange={(e) => setSponsor(e.target.value)}
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="recipient emails (comma-separated)"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
              />
              <button
                type="button"
                className="rounded bg-neutral-800 px-3 py-2 text-white disabled:opacity-50"
                disabled={busy}
                onClick={() =>
                  void postJson("/api/v1/admin/pilot-os/organizations", {
                    slug,
                    display_name: displayName,
                    legal_name: legalName || null,
                    sponsor_label: sponsor || null,
                    recipient_emails: recipients
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                    is_synthetic: false,
                  })
                }
              >
                Create candidate
              </button>
            </div>
          </div>

          <div className="rounded border border-amber-200 bg-amber-50/40 p-4">
            <h2 className="font-medium">2. Founder-approve organization</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Requires founder_org_approval_ref ≥8, sponsor, legal name, named recipients.
            </p>
            <div className="mt-3 grid gap-2">
              <input
                className="rounded border px-2 py-1"
                placeholder="org id"
                value={approveOrgId}
                onChange={(e) => setApproveOrgId(e.target.value)}
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="approved_by_label"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="founder_org_approval_ref (≥8)"
                value={orgApprovalRef}
                onChange={(e) => setOrgApprovalRef(e.target.value)}
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="sponsor_label (if not on candidate)"
                value={sponsor}
                onChange={(e) => setSponsor(e.target.value)}
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="legal_name (if not on candidate)"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
              />
              <button
                type="button"
                className="rounded bg-neutral-800 px-3 py-2 text-white disabled:opacity-50"
                disabled={busy || !approveOrgId.trim()}
                onClick={() =>
                  void postJson(`/api/v1/admin/pilot-os/organizations/${approveOrgId.trim()}/approve`, {
                    approved_by_label: approvedBy,
                    founder_org_approval_ref: orgApprovalRef,
                    sponsor_label: sponsor || null,
                    legal_name: legalName || null,
                  })
                }
              >
                Approve (no send)
              </button>
            </div>
          </div>

          <div className="rounded border border-neutral-200 p-4">
            <h2 className="font-medium">3. Prepare invitation pack (READY_UNSENT)</h2>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded border px-2 py-1"
                placeholder="approved org id"
                value={packOrgId}
                onChange={(e) => setPackOrgId(e.target.value)}
              />
              <button
                type="button"
                className="rounded bg-neutral-800 px-3 py-2 text-white disabled:opacity-50"
                disabled={busy || !packOrgId.trim()}
                onClick={() =>
                  void postJson(
                    `/api/v1/admin/pilot-os/organizations/${packOrgId.trim()}/invitation-packs`,
                    {},
                  )
                }
              >
                Prepare pack
              </button>
            </div>
            <ul className="mt-2 text-xs text-neutral-600">
              {(status.invitation_packs || []).map((p) => (
                <li key={p.id}>
                  pack #{p.id} org={p.organization_id} · {p.status}
                  {p.sent_at ? ` · sent ${p.sent_at}` : " · unsent"}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded border border-red-200 bg-red-50/30 p-4">
            <h2 className="font-medium">4. Send (gated — never as a test)</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Check send-safety first. Requires separate founder_send_approval_ref ≥8. Launch stays
              NO-GO. Do not mass-outreach.
            </p>
            <div className="mt-3 grid gap-2">
              <input
                className="rounded border px-2 py-1"
                placeholder="pack id"
                value={sendPackId}
                onChange={(e) => setSendPackId(e.target.value)}
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="founder_send_approval_ref (≥8)"
                value={sendRef}
                onChange={(e) => setSendRef(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded border border-neutral-400 px-3 py-2 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void checkSendSafety()}
                >
                  Check send-safety
                </button>
                <button
                  type="button"
                  className="rounded bg-red-800 px-3 py-2 text-white disabled:opacity-50"
                  disabled={busy || !sendPackId.trim() || sendRef.trim().length < 8}
                  onClick={() =>
                    void postJson(`/api/v1/admin/pilot-os/invitation-packs/${sendPackId.trim()}/send`, {
                      founder_send_approval_ref: sendRef,
                    })
                  }
                >
                  Send invitations
                </button>
              </div>
              {sendGate ? (
                <pre className="overflow-x-auto rounded bg-white p-2 text-xs">
                  {JSON.stringify(sendGate, null, 2)}
                </pre>
              ) : null}
            </div>
          </div>

          <div className="rounded border border-neutral-200 p-4">
            <h2 className="font-medium">Customer-usable vs Hard LIVE</h2>
            <ul className="mt-2 list-inside list-disc text-neutral-700">
              <li>
                Customer-usable PASS: {status.customer_usable?.customer_usable_pass ?? "—"}
              </li>
              <li>
                Hard LIVE CORE technical:{" "}
                {status.customer_usable?.hard_live_core_pass_technical ?? 143} (existence only)
              </li>
              <li>
                Journey:{" "}
                {status.customer_usable?.multi_role_journey_id ||
                  status.customer_usable?.minimal_journey_id ||
                  "—"}
              </li>
            </ul>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <h2 className="font-medium">Stance (frozen)</h2>
            <ul className="mt-2 list-inside list-disc text-neutral-700">
              <li>Pilot: {String(status.stance?.pilot)}</li>
              <li>Launch: {String(status.stance?.launch)}</li>
              <li>Enrollment: {String(status.stance?.enrollment)}</li>
              <li>Phase 3B: {String(status.stance?.phase_3b)}</li>
              <li>Gate F: {String(status.stance?.gate_f)}</li>
            </ul>
            <p className="mt-2 text-neutral-600">
              Canonical: {status.canonical_url || "https://twin-sooty.vercel.app"}
            </p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
