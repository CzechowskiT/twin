/** Deterministic executive product proof data — no PII, no fake traction. */

export type ExecutiveProofSorLayer = {
  id: string;
  layer: string;
  modules: string;
  status: "live" | "pilot" | "not_live";
  boundary: string;
};

export type ExecutiveProofMaturityRow = {
  id: string;
  module: string;
  maturity: "live" | "pilot" | "planned" | "not_live";
  evidence: string;
};

export type ExecutiveProofDeliveryEntry = {
  id: string;
  pr: string;
  title: string;
  lane: string;
  shipped_at: string;
};

export type ExecutiveProofRisk = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  mitigation: string;
};

export type ExecutiveProofMilestone = {
  id: string;
  title: string;
  target: string;
  status: "done" | "in_progress" | "planned";
};

export const EXECUTIVE_PRODUCT_PROOF_SOR_STACK: ExecutiveProofSorLayer[] = [
  {
    id: "sor-1",
    layer: "Candidate SOR",
    modules: "Panel, jobs, matches, profile, CV, applications, evidence, calendar",
    status: "live",
    boundary: "Human decision on apply; no auto-apply live",
  },
  {
    id: "sor-2",
    layer: "Recruiter SOR",
    modules: "Inbox, jobs, pipeline, talent radar, talent pool, search, analytics",
    status: "pilot",
    boundary: "No automatic outreach; human accept/decline",
  },
  {
    id: "sor-3",
    layer: "Company SOR",
    modules: "Hiring dashboard, roles, talent pool, team, billing readiness",
    status: "pilot",
    boundary: "No ATS writeback; import readiness preview",
  },
  {
    id: "sor-4",
    layer: "Collaboration & trust",
    modules: "Profile 360, notes/feedback, trust, team, communication, decision memory",
    status: "pilot",
    boundary: "Draft-only comms; audit context only",
  },
  {
    id: "sor-5",
    layer: "Integrations",
    modules: "ATS import readiness, calendar OAuth, placement verification demo",
    status: "pilot",
    boundary: "No live ATS sync; mapping draft",
  },
  {
    id: "sor-6",
    layer: "Investor & demo",
    modules: "Public room, metrics reality, roadmap, data room, product proof",
    status: "live",
    boundary: "NO-GO launch stance; honest status only",
  },
];

export const EXECUTIVE_PRODUCT_PROOF_MATURITY_MATRIX: ExecutiveProofMaturityRow[] = [
  { id: "m-1", module: "System-of-record navigation hub", maturity: "live", evidence: "PR #169 — persona route registry" },
  { id: "m-2", module: "Job-specific pipeline statuses", maturity: "pilot", evidence: "PR #157 — demo pipeline stages" },
  { id: "m-3", module: "Notes, feedback & scorecards", maturity: "pilot", evidence: "PR #158 — collaboration workspace" },
  { id: "m-4", module: "GDPR consent & contact history", maturity: "pilot", evidence: "Consent review surfaces" },
  { id: "m-5", module: "Safe email communication", maturity: "pilot", evidence: "PR #163 — draft-only layer" },
  { id: "m-6", module: "Team collaboration", maturity: "pilot", evidence: "PR #162 — shared workspace" },
  { id: "m-7", module: "Decision memory / audit trail", maturity: "pilot", evidence: "PR #170 — executive audit cockpit" },
  { id: "m-8", module: "Auto-apply / outreach", maturity: "not_live", evidence: "Paused — human decision required" },
  { id: "m-9", module: "ATS bidirectional sync", maturity: "not_live", evidence: "Import readiness only" },
];

export const EXECUTIVE_PRODUCT_PROOF_DELIVERY_HISTORY: ExecutiveProofDeliveryEntry[] = [
  { id: "d-1", pr: "#152–#165", title: "SOR module slices (pipeline, profile, trust, comms)", lane: "safe-lane", shipped_at: "2026-06-17" },
  { id: "d-2", pr: "#169", title: "System-of-record navigation hub", lane: "safe-lane", shipped_at: "2026-06-17" },
  { id: "d-3", pr: "#170", title: "Unified decision memory / audit trail", lane: "safe-lane", shipped_at: "2026-06-17" },
  { id: "d-4", pr: "—", title: "Phase 3B controlled multitab", lane: "blocked", shipped_at: "2026-06-17" },
];

export const EXECUTIVE_PRODUCT_PROOF_RISKS: ExecutiveProofRisk[] = [
  {
    id: "r-1",
    title: "P0 browser memory / multitab performance",
    severity: "high",
    mitigation: "OPEN — Phase 3B hard blocked; safe-lane delivery only",
  },
  {
    id: "r-2",
    title: "Premature launch with auto-apply or outreach",
    severity: "high",
    mitigation: "NO-GO stance; draft-only and human decision boundaries in UI",
  },
  {
    id: "r-3",
    title: "ATS sync expectations vs pilot reality",
    severity: "medium",
    mitigation: "Import readiness preview; no writeback claims in copy",
  },
  {
    id: "r-4",
    title: "Trust language leakage (forbidden claims)",
    severity: "medium",
    mitigation: "trust-language-guard + i18n coverage CI",
  },
];

export const EXECUTIVE_PRODUCT_PROOF_MILESTONES: ExecutiveProofMilestone[] = [
  { id: "ms-1", title: "SOR navigation hub + decision memory", target: "2026-06-17", status: "done" },
  { id: "ms-2", title: "Executive product proof board demo", target: "2026-06-17", status: "in_progress" },
  { id: "ms-3", title: "Recruiter & company daily cockpits", target: "2026-06-18", status: "planned" },
  { id: "ms-4", title: "Candidate trust center", target: "2026-06-18", status: "planned" },
  { id: "ms-5", title: "P0 performance closure (not Phase 3B)", target: "TBD", status: "planned" },
];
