/**
 * Seven-day D5 investor slice — honest preview hierarchy, invite-only data room,
 * placement pilot boundary, board hidden from default hub. Frontend/UI only.
 */

/** Public investor room — preview copy, one CTA, less badge noise. */
export const INVESTOR_ROOM_SIMPLIFIED_HIERARCHY = true;

/** Duplicate SoR hub hidden on public /investor — workspace owns navigation. */
export const HIDE_INVESTOR_SOR_ON_PUBLIC_ROOM = true;

/** Personas, demo map, status matrix, roadmap, risks collapsed on public room. */
export const COLLAPSE_INVESTOR_ROOM_DETAIL_SECTIONS = true;

/** Single honest next action on investor workspace hub. */
export const SHOW_INVESTOR_HUB_NEXT_ACTION = true;

/** First diligence step — metrics reality before depth modules. */
export const INVESTOR_HUB_NEXT_ACTION_HREF = "/investor/metrics" as const;

/** Wave 1 reversed — data room visible on workspace hub with PREVIEW badge. */
export const HIDE_INVESTOR_DATA_ROOM_FROM_HUB = false;

/** Wave 1 reversed — placement visible on workspace hub with PILOT badge. */
export const HIDE_INVESTOR_PLACEMENT_FROM_HUB = false;

/** Data room founder_decision — invite-only preview, no fake live secure room. */
export const DATA_ROOM_INVITE_ONLY_PREVIEW = true;
export const DATA_ROOM_FOUNDER_DECISION = true;

/** Placement economics — limited pilot DD cohort only. */
export const PLACEMENT_LIMITED_PILOT = true;

/** Trust / product proof — founder-led preview, no verified external customer claims. */
export const TRUST_PROOF_PREVIEW_BOUNDARY = true;
export const PRODUCT_PROOF_PREVIEW_BOUNDARY = true;

/** Board evidence visible in investor hub — collapsed by default. */
export const HIDE_BOARD_FROM_INVESTOR_DEFAULT_HUB = false;
export const INVESTOR_BOARD_COLLAPSED_DEFAULT = true;

/** Metrics, calculator, roadmap — controlled illustrative preview copy. */
export const INVESTOR_METRICS_CONTROLLED_PREVIEW = true;
export const INVESTOR_CALCULATOR_ILLUSTRATIVE_ONLY = true;
export const INVESTOR_ROADMAP_CONTROLLED_PREVIEW = true;

/** Investor UI must not claim public launch GO. */
export const NO_PUBLIC_LAUNCH_CLAIMS_INVESTOR_UI = true;

/** Wave 2B slice 4 — investor metrics confirmed GREEN_WORKING (read-only diligence aggregates). */
export const INVESTOR_METRICS_SHIP_STATUS = "live" as const;

/** Wave 2B slice 4 — investor roadmap confirmed GREEN_WORKING (transparent production reality). */
export const INVESTOR_ROADMAP_SHIP_STATUS = "live" as const;

/** Wave 2B slice 4 — investor calculator confirmed GREEN_WORKING (illustrative planning only). */
export const INVESTOR_CALCULATOR_SHIP_STATUS = "live" as const;

/** Wave 2B slice 4 — investor contact confirmed GREEN_WORKING (founder conversation CTA). */
export const INVESTOR_CONTACT_SHIP_STATUS = "live" as const;

/** Live public-preview investor modules — green-only workspace hub (4 cards). */
export const INVESTOR_PRIMARY_MODULE_IDS = [
  "metrics",
  "roadmap",
  "calculator",
  "contact",
  "investor_metrics",
  "investor_roadmap",
  "investor_calculator",
  "investor_contact",
] as const;

/** Pilot/preview modules — visible in hub pilot section (not hidden). */
export const INVESTOR_ROADMAP_MODULE_IDS = [
  "investor_data_room",
  "data_room",
  "investor_placement",
  "placement",
  "investor_trust_proof",
  "login",
  "investor_login",
  "working_features_readiness",
  "working_data_readiness",
  "board_implementation_tracker",
  "production_persistence_status",
  "first_working_persistence_plan",
  "audit_event_foundation",
] as const;

/** Investor public login preview — visible on public room with PREVIEW badge. */
export const INVESTOR_PUBLIC_LOGIN_ROADMAP_STATUS = "preview" as const;

/** Login preview card visible on public investor room grid. */
export const HIDE_INVESTOR_PUBLIC_LOGIN_FROM_PREVIEW = false;

/** Login restored to workspace hub — roadmap anchor is additional context. */
export const INVESTOR_PUBLIC_LOGIN_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE = false;

/** Login hub investor zone — roadmap anchor, not primary self-service sign-in CTA. */
export const LOGIN_HUB_INVESTOR_ZONE_HREF = "/investor/roadmap#investor-public-login" as const;

export { INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF } from "@/lib/all-workspace-green-gate";
