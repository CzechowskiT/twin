import type { WorkspaceModuleDef } from "@/lib/workspace-module-status";
import {
  INVESTOR_CALCULATOR_SHIP_STATUS,
  INVESTOR_CONTACT_SHIP_STATUS,
  INVESTOR_METRICS_SHIP_STATUS,
  INVESTOR_ROADMAP_SHIP_STATUS,
} from "@/lib/seven-day-d5-investor";

const DECK_MAIL = "contact@twin.care";

/** Investor hub module cards — gated tools + public preview. */
export const INVESTOR_WORKSPACE_MODULES: readonly WorkspaceModuleDef[] = [
  {
    id: "metrics",
    href: "/investor/metrics",
    titleKey: "workspaceModules.investorMetricsTitle",
    valuePropKey: "workspaceModules.investorMetricsValue",
    hintKey: "workspaceModules.investorMetricsHint",
    ctaKey: "workspaceModules.investorMetricsCta",
    status: INVESTOR_METRICS_SHIP_STATUS,
  },
  {
    id: "roadmap",
    href: "/investor/roadmap",
    titleKey: "workspaceModules.investorRoadmapTitle",
    valuePropKey: "workspaceModules.investorRoadmapValue",
    ctaKey: "workspaceModules.investorRoadmapCta",
    status: INVESTOR_ROADMAP_SHIP_STATUS,
  },
  {
    id: "data_room",
    href: "/investor/data-room",
    titleKey: "workspaceModules.investorDataRoomTitle",
    valuePropKey: "workspaceModules.investorDataRoomValue",
    hintKey: "workspaceModules.investorDataRoomHint",
    ctaKey: "workspaceModules.investorDataRoomCta",
    status: "preview",
    statusLabelKey: "sevenDayD5.dataRoomInviteOnlyBadge",
  },
  {
    id: "calculator",
    href: "/investor/calculator",
    titleKey: "workspaceModules.investorCalculatorTitle",
    valuePropKey: "workspaceModules.investorCalculatorValue",
    ctaKey: "workspaceModules.investorCalculatorCta",
    status: INVESTOR_CALCULATOR_SHIP_STATUS,
  },
  {
    id: "placement",
    href: "/investor/placement",
    titleKey: "workspaceModules.investorPlacementTitle",
    valuePropKey: "workspaceModules.investorPlacementValue",
    ctaKey: "workspaceModules.investorPlacementCta",
    status: "pilot",
  },
  {
    id: "contact",
    href: `mailto:${DECK_MAIL}`,
    titleKey: "workspaceModules.investorContactTitle",
    valuePropKey: "workspaceModules.investorContactValue",
    ctaKey: "workspaceModules.investorContactCta",
    status: INVESTOR_CONTACT_SHIP_STATUS,
  },
];

/** Public investor room preview cards (unauthenticated). */
export const INVESTOR_PUBLIC_PREVIEW_MODULES: readonly WorkspaceModuleDef[] = [
  {
    id: "public_room",
    href: "/investor",
    titleKey: "workspaceModules.investorPublicRoomTitle",
    valuePropKey: "workspaceModules.investorPublicRoomValue",
    ctaKey: "workspaceModules.investorPublicRoomCta",
    status: "live",
  },
  {
    id: "login",
    href: "/login/investor",
    titleKey: "workspaceModules.investorLoginTitle",
    valuePropKey: "workspaceModules.investorLoginValue",
    hintKey: "workspaceModules.investorLoginHint",
    ctaKey: "workspaceModules.investorLoginCta",
    status: "preview",
    statusLabelKey: "productPolish.investorInviteOnlyBadge",
  },
];
