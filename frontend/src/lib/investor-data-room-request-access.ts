/** Investor data room — public GitHub docs + request-access flow (no uploads). */
export const TWIN_GITHUB_REPO = "https://github.com/CzechowskiT/twin";
export const TWIN_GITHUB_MAIN_BLOB = `${TWIN_GITHUB_REPO}/blob/main`;
export const INVESTOR_DATA_ROOM_ROUTE = "/investor/data-room";
export const INVESTOR_DATA_ROOM_FOUNDER_EMAIL = "contact@twin.care";
export const INVESTOR_DATA_ROOM_PUBLIC_DOCS = [
  { id: "dueDiligencePack", path: "docs/INVESTOR_CTO_DUE_DILIGENCE_PACK_2026-05-28.md" },
  { id: "demoRunbook", path: "docs/INVESTOR_DEMO_RUNBOOK.md" },
  { id: "placementVerification", path: "docs/PLACEMENT_VERIFICATION.md" },
  { id: "qaTop10", path: "docs/INVESTOR_QA_TOP10.md" },
] as const;
export const INVESTOR_DATA_ROOM_LIVE_SURFACE_IDS = ["metrics", "status", "calculator", "openApi"] as const;
export const INVESTOR_DATA_ROOM_CONFIDENTIAL_SLOTS = ["cap", "fin", "legal"] as const;
export const INVESTOR_DATA_ROOM_VISUAL_MARKERS = {
  transparencyBanner: "data-investor-room-transparency",
  publicDocs: "data-investor-room-public-docs",
  liveSurfaces: "data-investor-room-live-surfaces",
  confidential: "data-investor-room-confidential",
  founderContact: "data-investor-room-founder",
  requestAccessCta: "data-investor-room-request-access",
} as const;
export function githubDocHref(repoRelativePath: string): string {
  return `${TWIN_GITHUB_MAIN_BLOB}/${repoRelativePath.replace(/^\//, "")}`;
}
export function buildInvestorDataRoomMailto(params: { subject: string; body: string }): string {
  const query = new URLSearchParams({ subject: params.subject, body: params.body });
  return `mailto:${INVESTOR_DATA_ROOM_FOUNDER_EMAIL}?${query.toString()}`;
}
