import type { TranslationKey } from "@/lib/i18n";

export const INVESTOR_ROOM_ROUTE = "/investor";
export type InvestorRoomStatusTier = "live" | "demo" | "notLive";
export const INVESTOR_ROOM_STATUS_ITEM_IDS = [
  "marketingPilot","candidateCore","jobCorpus","interactiveDemo","candidateCalendar",
  "recruiterInbox","recruiterScheduling","recruiterMessageDrafts","placementVerification",
  "investorSurfaces","stripeBilling","autoApply","delegatedApply",
  "recruiterCalendarSync","recruiterIntegrations","publicLaunch",
] as const;
export type InvestorRoomStatusItemId = (typeof INVESTOR_ROOM_STATUS_ITEM_IDS)[number];
export const INVESTOR_ROOM_STATUS: Record<InvestorRoomStatusItemId, InvestorRoomStatusTier> = {
  marketingPilot:"live",candidateCore:"live",jobCorpus:"live",interactiveDemo:"demo",
  candidateCalendar:"live",recruiterInbox:"live",recruiterScheduling:"live",
  recruiterMessageDrafts:"live",placementVerification:"live",investorSurfaces:"live",
  stripeBilling:"live",autoApply:"notLive",delegatedApply:"notLive",
  recruiterCalendarSync:"notLive",recruiterIntegrations:"notLive",publicLaunch:"notLive",
};
export const INVESTOR_ROOM_PERSONA_IDS = ["candidate","recruiter","company"] as const;
export type InvestorRoomPersonaId = (typeof INVESTOR_ROOM_PERSONA_IDS)[number];
export const INVESTOR_ROOM_DEMO_MAP = [
  { id:"interactiveDemo",href:"/demo",labelKey:"investorRoom.demoMapInteractive" as const },
  { id:"metrics",href:"/investor/metrics",labelKey:"investorRoom.demoMapMetrics" as const },
  { id:"productProof",href:"/investor/product-proof",labelKey:"investorRoom.demoMapProductProof" as const },
  { id:"status",href:"/status",labelKey:"investorRoom.demoMapStatus" as const },
  { id:"calculator",href:"/investor/calculator",labelKey:"investorRoom.demoMapCalculator" as const },
  { id:"dataRoom",href:"/investor/data-room",labelKey:"investorRoom.demoMapDataRoom" as const },
  { id:"recruiterInbox",href:"/recruiter/inbox",labelKey:"investorRoom.demoMapRecruiterInbox" as const },
  { id:"placement",href:"/investor/placement",labelKey:"investorRoom.demoMapPlacement" as const },
] as const;
export const INVESTOR_ROOM_ROADMAP_IDS = ["r1","r2","r3","r4"] as const;
export const INVESTOR_ROOM_RISK_IDS = ["k1","k2","k3","k4"] as const;
export const INVESTOR_ROOM_VISUAL_MARKERS = {
  page:"investor-room-page",statusSection:"investor-room-status",launchStanceBanner:"investor-room-launch-stance",
  statusBadge:"investor-room-status-badge",personaCard:"investor-room-persona-card",demoMap:"investor-room-demo-map",
} as const;
export function investorRoomStatusLabelKey(tier: InvestorRoomStatusTier): TranslationKey {
  return tier === "live" ? "investorRoom.statusLive" : tier === "demo" ? "investorRoom.statusDemo" : "investorRoom.statusNotLive";
}
export function investorRoomStatusTitleKey(id: InvestorRoomStatusItemId): TranslationKey { return `investorRoom.statusItem_${id}_title` as TranslationKey; }
export function investorRoomStatusBodyKey(id: InvestorRoomStatusItemId): TranslationKey { return `investorRoom.statusItem_${id}_body` as TranslationKey; }
export function investorRoomPersonaTitleKey(id: InvestorRoomPersonaId): TranslationKey { return `investorRoom.persona_${id}_title` as TranslationKey; }
export function investorRoomPersonaBodyKey(id: InvestorRoomPersonaId): TranslationKey { return `investorRoom.persona_${id}_body` as TranslationKey; }
export function investorRoomRoadmapKey(id: (typeof INVESTOR_ROOM_ROADMAP_IDS)[number]): TranslationKey { return `investorRoom.roadmap_${id}` as TranslationKey; }
export function investorRoomRiskTitleKey(id: (typeof INVESTOR_ROOM_RISK_IDS)[number]): TranslationKey { return `investorRoom.risk_${id}_title` as TranslationKey; }
export function investorRoomRiskMitigationKey(id: (typeof INVESTOR_ROOM_RISK_IDS)[number]): TranslationKey { return `investorRoom.risk_${id}_mitigation` as TranslationKey; }
