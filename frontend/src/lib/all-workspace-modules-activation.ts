/**
 * All-workspace module activation — honest visibility + GREEN_WORKING tracking.
 * Supersedes WORKSPACE_GREEN_ONLY_MODE (founder decision 2026-07-10).
 */
import type { MarketingPersona } from "@/lib/marketing-persona";
import { SYSTEM_OF_RECORD_ROUTES } from "@/lib/system-of-record-routes";
import type { WorkspaceModuleStatus } from "@/lib/workspace-module-status";

export type WorkspaceModuleActivationStatus =
  | "LIVE"
  | "PILOT"
  | "PREVIEW"
  | "COMING_SOON"
  | "PAUSED"
  | "INTERNAL";

export type WorkspaceModuleHubSection =
  | "core"
  | "extended"
  | "pilot_preview"
  | "coming_soon_paused"
  | "internal";

export type ActivationEffort = "XS" | "S" | "M" | "L" | "XL";

export type WorkspaceModuleActivationEntry = {
  id: string;
  workspace: MarketingPersona;
  route: string;
  activationStatus: WorkspaceModuleActivationStatus;
  hubSection: WorkspaceModuleHubSection;
  visible: boolean;
  green: boolean;
  userGoal: string;
  worksSummary: string;
  gapsSummary: string;
  nextAction: string;
  dependencies: readonly string[];
  effort: ActivationEffort;
  targetWave: string;
  owner: string;
};

/** Security-sensitive or meta modules — never shown in persona hubs. */
export const INTERNAL_MODULE_IDS = new Set([
  "auto_apply",
  "plan_payments",
  "candidate_plan",
  "candidate_revoke_delete",
  "recruiter_hub",
  "recruiter_operational_work_queue",
  "recruiter_ats_import_readiness",
  "company_ats_import_readiness",
  "company_billing",
]);

/** Modules confirmed GREEN_WORKING (Wave 2B smoke-close + core MVP). */
export const GREEN_WORKING_MODULE_IDS = new Set([
  // Candidate core
  "candidate_panel",
  "profile",
  "candidate_profile",
  "candidate_cv",
  "candidate_jobs",
  "jobs",
  "candidate_matches",
  "matches",
  "candidate_applications",
  "applications",
  "candidate_calendar",
  "calendar",
  "candidate_identity",
  "identity",
  "candidate_evidence",
  "evidence",
  "candidate_interview_prep",
  "interview_prep",
  // Recruiter core
  "recruiter_inbox",
  "inbox",
  "recruiter_pipeline",
  "pipeline",
  "recruiter_jobs",
  "recruiter_search",
  "search",
  "recruiter_analytics",
  "analytics",
  // Company core
  "company_dashboard",
  "company_roles",
  "roles",
  "company_pipeline",
  // Investor core
  "investor_metrics",
  "metrics",
  "investor_roadmap",
  "roadmap",
  "investor_calculator",
  "calculator",
  "investor_contact",
  "contact",
  "investor_product_proof",
  "investor_public_room",
  "investor_workspace_hub",
]);

/** Extended live surfaces — visible, functional previews beyond core green set. */
const EXTENDED_MODULE_IDS = new Set([
  "candidate_career_compass",
  "career_compass",
  "recruiter_demo_pipeline",
  "recruiter_demo_profile_360",
  "recruiter_demo_collaboration",
  "recruiter_demo_trust",
  "recruiter_demo_team",
  "recruiter_demo_communication",
  "recruiter_demo_decision_memory",
  "company_demo_pipeline",
  "company_demo_profile_360",
  "company_demo_collaboration",
  "company_demo_trust",
  "company_demo_team",
  "company_demo_communication",
  "company_demo_decision_memory",
  "company_candidate_trust_summary",
  "investor_demo",
  "investor_sor_proof_pipeline",
  "investor_sor_proof_collaboration",
  "investor_sor_proof_ats",
]);

const ACTIVATION_OVERRIDES: Partial<
  Record<
    string,
    Pick<
      WorkspaceModuleActivationEntry,
      | "activationStatus"
      | "hubSection"
      | "green"
      | "userGoal"
      | "worksSummary"
      | "gapsSummary"
      | "nextAction"
      | "dependencies"
      | "effort"
      | "targetWave"
      | "owner"
    >
  >
> = {
  candidate_career_compass: {
    activationStatus: "PILOT",
    hubSection: "extended",
    green: false,
    userGoal: "Skill gaps, target role positioning, learning priorities with persisted state.",
    worksSummary: "PostgreSQL `candidate_career_compass` table, GET/PUT/PATCH API, dashboard save/load.",
    gapsSummary: "Founder browser smoke pending — NEEDS_FOUNDER_AUTH_SMOKE.",
    nextAction: "Persistence shipped — run founder browser smoke on /dashboard/career with demo@twin.career.",
    dependencies: ["candidate_profile"],
    effort: "S",
    targetWave: "B",
    owner: "candidate-squad",
  },
  career_compass: {
    activationStatus: "PILOT",
    hubSection: "extended",
    green: false,
    userGoal: "Skill gaps, target role positioning, learning priorities with persisted state.",
    worksSummary: "PostgreSQL `candidate_career_compass` table, GET/PUT/PATCH API, dashboard save/load.",
    gapsSummary: "Founder browser smoke pending — NEEDS_FOUNDER_AUTH_SMOKE.",
    nextAction: "Persistence shipped — run founder browser smoke on /dashboard/career with demo@twin.career.",
    dependencies: ["candidate_profile"],
    effort: "S",
    targetWave: "B",
    owner: "candidate-squad",
  },
  candidate_trust: {
    activationStatus: "PILOT",
    hubSection: "pilot_preview",
    green: false,
    userGoal: "Transparency hub — what TWIN knows, visibility, consent.",
    worksSummary: "PostgreSQL trust tables, GET/POST consents, privacy requests, audit events, hub API load.",
    gapsSummary: "Founder browser smoke pending — NEEDS_FOUNDER_AUTH_SMOKE; subflows correction/export remain manual.",
    nextAction: "Persistence shipped — run founder browser smoke on /dashboard/trust with demo@twin.career.",
    dependencies: ["candidate_profile"],
    effort: "L",
    targetWave: "B",
    owner: "candidate-squad",
  },
  trust_center: {
    activationStatus: "PILOT",
    hubSection: "pilot_preview",
    green: false,
    userGoal: "Trust center card on candidate hub.",
    worksSummary: "Routes to trust hub with live API persistence for consents, receipts, privacy requests, audit.",
    gapsSummary: "Founder browser smoke pending — NEEDS_FOUNDER_AUTH_SMOKE.",
    nextAction: "Persistence shipped — run founder browser smoke on /dashboard/trust with demo@twin.career.",
    dependencies: ["candidate_trust"],
    effort: "L",
    targetWave: "B",
    owner: "candidate-squad",
  },
  daily_cockpit: {
    activationStatus: "PILOT",
    hubSection: "pilot_preview",
    green: false,
    userGoal: "Daily operating cockpit with tracked activation through first inbox decision.",
    worksSummary: "PostgreSQL activation state, GET /api/recruiter/activation, hub onboarding panel.",
    gapsSummary: "Founder browser smoke pending — NEEDS_FOUNDER_AUTH_SMOKE; demo queues unchanged.",
    nextAction: "Wave C slice 1 shipped — run founder smoke on /recruiter with pilot token.",
    dependencies: ["recruiter_inbox"],
    effort: "M",
    targetWave: "C",
    owner: "recruiter-squad",
  },
  recruiter_daily_cockpit: {
    activationStatus: "PILOT",
    hubSection: "pilot_preview",
    green: false,
    userGoal: "Daily operating cockpit with tracked activation through first inbox decision.",
    worksSummary: "PostgreSQL activation state, GET /api/recruiter/activation, hub onboarding panel.",
    gapsSummary: "Founder browser smoke pending — NEEDS_FOUNDER_AUTH_SMOKE; demo queues unchanged.",
    nextAction: "Wave C slice 1 shipped — run founder smoke on /recruiter with pilot token.",
    dependencies: ["recruiter_inbox"],
    effort: "M",
    targetWave: "C",
    owner: "recruiter-squad",
  },
  talent_pool: {
    activationStatus: "PILOT",
    hubSection: "pilot_preview",
    green: false,
    userGoal: "Structured internal talent pool — import, manual add, privacy-safe snapshots.",
    worksSummary: "PostgreSQL pool records (059+072), manual add/filter/detail/archive APIs, recruiter UI.",
    gapsSummary: "Founder browser smoke pending — NEEDS_FOUNDER_AUTH_SMOKE.",
    nextAction: "Wave C slice 2 shipped — run founder smoke on /recruiter/talent-pool with pilot token.",
    dependencies: ["recruiter_inbox"],
    effort: "M",
    targetWave: "C",
    owner: "recruiter-squad",
  },
  recruiter_talent_pool: {
    activationStatus: "PILOT",
    hubSection: "pilot_preview",
    green: false,
    userGoal: "Structured internal talent pool — import, manual add, privacy-safe snapshots.",
    worksSummary: "PostgreSQL pool records (059+072), manual add/filter/detail/archive APIs, recruiter UI.",
    gapsSummary: "Founder browser smoke pending — NEEDS_FOUNDER_AUTH_SMOKE.",
    nextAction: "Wave C slice 2 shipped — run founder smoke on /recruiter/talent-pool with pilot token.",
    dependencies: ["recruiter_inbox"],
    effort: "M",
    targetWave: "C",
    owner: "recruiter-squad",
  },
  trust_review_queue: {
    activationStatus: "PILOT",
    hubSection: "pilot_preview",
    green: false,
    userGoal: "Human review queue for candidate trust/privacy requests affecting recruiter visibility.",
    worksSummary: "PostgreSQL trust review items + decisions, sync from Trust Center privacy requests, decision API.",
    gapsSummary: "Founder browser smoke pending — NEEDS_FOUNDER_AUTH_SMOKE; no automated fulfillment.",
    nextAction: "Wave C slice 2 shipped — run founder smoke on /recruiter/trust-review-queue with pilot token.",
    dependencies: ["candidate_trust", "recruiter_inbox"],
    effort: "M",
    targetWave: "C",
    owner: "recruiter-squad",
  },
  recruiter_trust_review_queue: {
    activationStatus: "PILOT",
    hubSection: "pilot_preview",
    green: false,
    userGoal: "Human review queue for candidate trust/privacy requests affecting recruiter visibility.",
    worksSummary: "PostgreSQL trust review items + decisions, sync from Trust Center privacy requests, decision API.",
    gapsSummary: "Founder browser smoke pending — NEEDS_FOUNDER_AUTH_SMOKE; no automated fulfillment.",
    nextAction: "Wave C slice 2 shipped — run founder smoke on /recruiter/trust-review-queue with pilot token.",
    dependencies: ["candidate_trust", "recruiter_inbox"],
    effort: "M",
    targetWave: "C",
    owner: "recruiter-squad",
  },
  login: {
    activationStatus: "PREVIEW",
    hubSection: "pilot_preview",
    green: false,
    userGoal: "Invite-only investor access preview.",
    worksSummary: "Login form shell + invite-only copy.",
    gapsSummary: "No self-service investor onboarding.",
    nextAction: "Wave E — investor auth persistence.",
    dependencies: ["investor_workspace_hub"],
    effort: "M",
    targetWave: "E",
    owner: "investor-squad",
  },
  investor_data_room: {
    activationStatus: "PREVIEW",
    hubSection: "pilot_preview",
    green: false,
    userGoal: "Secure diligence document room.",
    worksSummary: "Invite-only preview shell.",
    gapsSummary: "No live secure document delivery.",
    nextAction: "Wave E — data room access control + asset links.",
    dependencies: ["investor_metrics"],
    effort: "L",
    targetWave: "E",
    owner: "investor-squad",
  },
  data_room: {
    activationStatus: "PREVIEW",
    hubSection: "pilot_preview",
    green: false,
    userGoal: "Data room workspace card.",
    worksSummary: "Preview route.",
    gapsSummary: "Invite-only — not live secure room.",
    nextAction: "Wave E — data room activation.",
    dependencies: ["investor_metrics"],
    effort: "L",
    targetWave: "E",
    owner: "investor-squad",
  },
  recruiter_integrations: {
    activationStatus: "COMING_SOON",
    hubSection: "coming_soon_paused",
    green: false,
    userGoal: "ATS and calendar integration readiness.",
    worksSummary: "Readiness checklist UI.",
    gapsSummary: "No live ATS writeback or MS calendar sync.",
    nextAction: "Wave F — integrations after core personas green.",
    dependencies: ["recruiter_pipeline"],
    effort: "XL",
    targetWave: "F",
    owner: "integrations-squad",
  },
  integrations: {
    activationStatus: "COMING_SOON",
    hubSection: "coming_soon_paused",
    green: false,
    userGoal: "Integrations hub card.",
    worksSummary: "Honest boundary page.",
    gapsSummary: "No live sync.",
    nextAction: "Wave F — recruiter integrations activation.",
    dependencies: ["recruiter_pipeline"],
    effort: "XL",
    targetWave: "F",
    owner: "integrations-squad",
  },
  company_integrations: {
    activationStatus: "COMING_SOON",
    hubSection: "coming_soon_paused",
    green: false,
    userGoal: "Employer ATS integration readiness.",
    worksSummary: "Readiness checklist.",
    gapsSummary: "No live ATS writeback.",
    nextAction: "Wave F — company integrations.",
    dependencies: ["company_pipeline"],
    effort: "XL",
    targetWave: "F",
    owner: "integrations-squad",
  },
  recruiter_calendar: {
    activationStatus: "PAUSED",
    hubSection: "coming_soon_paused",
    green: false,
    userGoal: "Recruiter calendar sync for interview scheduling.",
    worksSummary: "Placeholder route with honest not-live copy.",
    gapsSummary: "Calendar provider sync not shipped.",
    nextAction: "Wave F — MS/Google calendar after core green.",
    dependencies: ["recruiter_inbox"],
    effort: "L",
    targetWave: "F",
    owner: "integrations-squad",
  },
  calendar: {
    activationStatus: "PAUSED",
    hubSection: "coming_soon_paused",
    green: false,
    userGoal: "Recruiter calendar module card.",
    worksSummary: "Honest paused badge.",
    gapsSummary: "Sync not live.",
    nextAction: "Wave F — calendar activation.",
    dependencies: ["recruiter_inbox"],
    effort: "L",
    targetWave: "F",
    owner: "integrations-squad",
  },
  company_billing: {
    activationStatus: "PAUSED",
    hubSection: "internal",
    green: false,
    userGoal: "Employer billing and plan management.",
    worksSummary: "Preview route only.",
    gapsSummary: "Stripe checkout not live.",
    nextAction: "Post-launch — billing after Gate F.",
    dependencies: ["company_dashboard"],
    effort: "XL",
    targetWave: "H",
    owner: "billing-squad",
  },
  billing: {
    activationStatus: "PAUSED",
    hubSection: "internal",
    green: false,
    userGoal: "Billing workspace card.",
    worksSummary: "Hidden from hub.",
    gapsSummary: "Not live.",
    nextAction: "Post-launch billing.",
    dependencies: ["company_dashboard"],
    effort: "XL",
    targetWave: "H",
    owner: "billing-squad",
  },
  auto_apply: {
    activationStatus: "PAUSED",
    hubSection: "internal",
    green: false,
    userGoal: "Autonomous apply — paused by founder.",
    worksSummary: "Readiness strip on dashboard only.",
    gapsSummary: "Explicitly paused — no auto-apply.",
    nextAction: "Not in first slices.",
    dependencies: ["candidate_applications"],
    effort: "XL",
    targetWave: "H",
    owner: "candidate-squad",
  },
};

function sorStatusToActivation(status: WorkspaceModuleStatus): WorkspaceModuleActivationStatus {
  switch (status) {
    case "live":
      return "LIVE";
    case "pilot":
      return "PILOT";
    case "preview":
      return "PREVIEW";
    case "coming_soon":
    case "planned":
    case "needs_setup":
      return "COMING_SOON";
    case "not_live":
    case "paused":
      return "PAUSED";
    default:
      return "PILOT";
  }
}

function defaultHubSection(
  id: string,
  activationStatus: WorkspaceModuleActivationStatus,
): WorkspaceModuleHubSection {
  if (INTERNAL_MODULE_IDS.has(id) || activationStatus === "INTERNAL") return "internal";
  if (activationStatus === "COMING_SOON" || activationStatus === "PAUSED") return "coming_soon_paused";
  if (activationStatus === "PILOT" || activationStatus === "PREVIEW") return "pilot_preview";
  if (EXTENDED_MODULE_IDS.has(id)) return "extended";
  if (activationStatus === "LIVE") return "core";
  return "pilot_preview";
}

function buildEntryFromRoute(
  id: string,
  workspace: MarketingPersona,
  route: string,
  sorStatus: WorkspaceModuleStatus,
): WorkspaceModuleActivationEntry {
  const override = ACTIVATION_OVERRIDES[id];
  const green = override?.green ?? GREEN_WORKING_MODULE_IDS.has(id);
  let activationStatus = override?.activationStatus ?? sorStatusToActivation(sorStatus);
  if (activationStatus === "LIVE" && !green) {
    activationStatus = sorStatus === "preview" ? "PREVIEW" : "PILOT";
  }
  if (INTERNAL_MODULE_IDS.has(id)) {
    activationStatus = "INTERNAL";
  }
  const hubSection = override?.hubSection ?? defaultHubSection(id, activationStatus);
  const visible = activationStatus !== "INTERNAL" && !INTERNAL_MODULE_IDS.has(id);

  return {
    id,
    workspace,
    route,
    activationStatus,
    hubSection,
    visible,
    green,
    userGoal: override?.userGoal ?? `Use ${id} in ${workspace} workspace.`,
    worksSummary: override?.worksSummary ?? (green ? "GREEN_WORKING — smoke-verified." : "UI shell or partial flow."),
    gapsSummary: override?.gapsSummary ?? (green ? "None for MVP scope." : "Needs activation to GREEN_WORKING."),
    nextAction: override?.nextAction ?? (green ? "Maintain — regression smoke." : "Schedule activation wave."),
    dependencies: override?.dependencies ?? [],
    effort: override?.effort ?? (green ? "XS" : "M"),
    targetWave: override?.targetWave ?? (green ? "A" : "B"),
    owner: override?.owner ?? `${workspace}-squad`,
  };
}

const SOR_ENTRIES: WorkspaceModuleActivationEntry[] = SYSTEM_OF_RECORD_ROUTES.map((r) =>
  buildEntryFromRoute(r.id, r.persona, r.href, r.status),
);

/** Extra workspace-card IDs not always in SoR (e.g. login preview, auto_apply). */
const EXTRA_ENTRIES: WorkspaceModuleActivationEntry[] = [
  buildEntryFromRoute("login", "investor", "/login/investor", "preview"),
  buildEntryFromRoute("auto_apply", "candidate", "/dashboard#auto-apply-readiness", "paused"),
  buildEntryFromRoute("trust_center", "candidate", "/dashboard/trust", "pilot"),
  buildEntryFromRoute("career_compass", "candidate", "/dashboard/career", "pilot"),
  buildEntryFromRoute("referrals", "candidate", "/dashboard/referrals", "pilot"),
  buildEntryFromRoute("plan_payments", "candidate", "/dashboard/billing", "pilot"),
  buildEntryFromRoute("trust_review_queue", "recruiter", "/recruiter/trust-review-queue", "pilot"),
  buildEntryFromRoute("daily_cockpit", "recruiter", "/recruiter/daily-cockpit", "pilot"),
  buildEntryFromRoute("talent_pool", "recruiter", "/recruiter/talent-pool", "pilot"),
  buildEntryFromRoute("talent_radar", "recruiter", "/recruiter/talent-radar", "pilot"),
  buildEntryFromRoute("talent_radar_digest", "recruiter", "/recruiter/talent-radar/digest", "pilot"),
  buildEntryFromRoute("integrations", "recruiter", "/recruiter/integrations", "coming_soon"),
  buildEntryFromRoute("hiring_cockpit", "company", "/company/hiring-cockpit", "pilot"),
  buildEntryFromRoute("hiring_command_center", "company", "/company/hiring-command-center", "pilot"),
  buildEntryFromRoute("team", "company", "/company/team", "pilot"),
  buildEntryFromRoute("talent_pool", "company", "/company/talent-pool", "pilot"),
  buildEntryFromRoute("billing", "company", "/company/billing", "not_live"),
  buildEntryFromRoute("integrations", "company", "/company/integrations", "coming_soon"),
  buildEntryFromRoute("data_room", "investor", "/investor/data-room", "preview"),
  buildEntryFromRoute("placement", "investor", "/investor/placement", "pilot"),
];

const ENTRY_BY_ID = new Map<string, WorkspaceModuleActivationEntry>();
for (const entry of [...SOR_ENTRIES, ...EXTRA_ENTRIES]) {
  if (!ENTRY_BY_ID.has(entry.id)) {
    ENTRY_BY_ID.set(entry.id, entry);
  }
}

/** Canonical activation registry — deduplicated by module ID. */
export const WORKSPACE_MODULE_ACTIVATION: readonly WorkspaceModuleActivationEntry[] = [
  ...ENTRY_BY_ID.values(),
];

export const ALL_WORKSPACE_MODULE_IDS: readonly string[] = WORKSPACE_MODULE_ACTIVATION.map((e) => e.id);

export const WORKSPACE_MODULE_ACTIVATION_STATUS: Readonly<
  Record<string, WorkspaceModuleActivationStatus>
> = Object.fromEntries(WORKSPACE_MODULE_ACTIVATION.map((e) => [e.id, e.activationStatus]));

export function getWorkspaceModuleActivationEntry(
  moduleId: string,
): WorkspaceModuleActivationEntry | undefined {
  return ENTRY_BY_ID.get(moduleId);
}

export function getWorkspaceModuleActivationStatus(
  moduleId: string,
): WorkspaceModuleActivationStatus {
  return ENTRY_BY_ID.get(moduleId)?.activationStatus ?? "PILOT";
}

export function isWorkspaceModuleVisible(moduleId: string): boolean {
  const entry = ENTRY_BY_ID.get(moduleId);
  if (!entry) return true;
  return entry.visible;
}

export function isWorkspaceModuleVisibleForPersona(
  persona: MarketingPersona,
  moduleId: string,
): boolean {
  const entry = resolveActivationEntry(persona, moduleId);
  if (!entry) return true;
  return entry.visible;
}

export function isWorkspaceModuleGreen(moduleId: string): boolean {
  return ENTRY_BY_ID.get(moduleId)?.green ?? false;
}

export function getWorkspaceModuleNextAction(moduleId: string): string {
  return ENTRY_BY_ID.get(moduleId)?.nextAction ?? "Schedule activation wave.";
}

export function getWorkspaceModuleDependencies(moduleId: string): readonly string[] {
  return ENTRY_BY_ID.get(moduleId)?.dependencies ?? [];
}

/** Resolve workspace card ID to activation entry (handles short ids like inbox → recruiter_inbox). */
function resolveActivationEntry(
  persona: MarketingPersona,
  moduleId: string,
): WorkspaceModuleActivationEntry | undefined {
  const direct = ENTRY_BY_ID.get(moduleId);
  if (direct && direct.workspace === persona) return direct;
  const personaPrefix =
    persona === "candidate"
      ? "candidate_"
      : persona === "recruiter"
        ? "recruiter_"
        : persona === "company"
          ? "company_"
          : "investor_";
  return (
    ENTRY_BY_ID.get(`${personaPrefix}${moduleId}`) ??
    ENTRY_BY_ID.get(`investor_${moduleId}`)
  );
}

export function getActivationEntriesForWorkspace(
  workspace: MarketingPersona,
): readonly WorkspaceModuleActivationEntry[] {
  return WORKSPACE_MODULE_ACTIVATION.filter((e) => e.workspace === workspace);
}

export function activationStatusToBadgeStatus(
  status: WorkspaceModuleActivationStatus,
): WorkspaceModuleStatus {
  switch (status) {
    case "LIVE":
      return "live";
    case "PILOT":
      return "pilot";
    case "PREVIEW":
      return "preview";
    case "COMING_SOON":
      return "coming_soon";
    case "PAUSED":
      return "paused";
    case "INTERNAL":
      return "not_live";
    default:
      return "pilot";
  }
}

export type ActivationHubSlice<T> = {
  core: readonly T[];
  extended: readonly T[];
  pilotPreview: readonly T[];
  comingSoonPaused: readonly T[];
  internal: readonly T[];
};

export function splitByActivationHubSection<T extends { id: string }>(
  items: readonly T[],
  persona: MarketingPersona,
): ActivationHubSlice<T> {
  const core: T[] = [];
  const extended: T[] = [];
  const pilotPreview: T[] = [];
  const comingSoonPaused: T[] = [];
  const internal: T[] = [];

  for (const item of items) {
    const entry = resolveActivationEntry(persona, item.id);
    if (!entry) {
      if (!isWorkspaceModuleVisibleForPersona(persona, item.id)) {
        internal.push(item);
      } else {
        pilotPreview.push(item);
      }
      continue;
    }
    if (!entry.visible || entry.activationStatus === "INTERNAL") {
      internal.push(item);
      continue;
    }
    switch (entry.hubSection) {
      case "core":
        core.push(item);
        break;
      case "extended":
        extended.push(item);
        break;
      case "pilot_preview":
        pilotPreview.push(item);
        break;
      case "coming_soon_paused":
        comingSoonPaused.push(item);
        break;
      default:
        internal.push(item);
    }
  }

  return { core, extended, pilotPreview, comingSoonPaused, internal };
}
