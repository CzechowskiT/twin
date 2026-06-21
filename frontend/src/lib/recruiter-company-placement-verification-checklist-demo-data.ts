/** Recruiter & company placement verification checklist — shared demo data. */

import type { TranslationKey } from "@/lib/i18n";

export type ChecklistItemStatus = "done" | "pending" | "blocked" | "not_applicable";

export type PlacementChecklistItem = {
  id: string;
  labelKey: TranslationKey;
  detailKey: TranslationKey;
  status: ChecklistItemStatus;
  persona: "recruiter" | "company" | "shared";
};

export type PlacementChecklistRecord = {
  placement_id: string;
  company_slug: string;
  role_title: string;
  items: readonly PlacementChecklistItem[];
  disabled_actions: readonly { id: string; labelKey: TranslationKey }[];
};

const SHARED_ITEMS: PlacementChecklistItem[] = [
  {
    id: "review_self_decl",
    labelKey: "placementChecklist.itemReviewSelfDecl",
    detailKey: "placementChecklist.detailReviewSelfDecl",
    status: "done",
    persona: "shared",
  },
  {
    id: "external_gap",
    labelKey: "placementChecklist.itemExternalGap",
    detailKey: "placementChecklist.detailExternalGap",
    status: "pending",
    persona: "shared",
  },
  {
    id: "risk_flags",
    labelKey: "placementChecklist.itemRiskFlags",
    detailKey: "placementChecklist.detailRiskFlags",
    status: "pending",
    persona: "shared",
  },
  {
    id: "human_review",
    labelKey: "placementChecklist.itemHumanReview",
    detailKey: "placementChecklist.detailHumanReview",
    status: "blocked",
    persona: "shared",
  },
  {
    id: "economics_noop",
    labelKey: "placementChecklist.itemEconomicsNoop",
    detailKey: "placementChecklist.detailEconomicsNoop",
    status: "not_applicable",
    persona: "shared",
  },
];

const RECRUITER_ITEMS: PlacementChecklistItem[] = [
  {
    id: "recruiter_ack",
    labelKey: "placementChecklist.itemRecruiterAck",
    detailKey: "placementChecklist.detailRecruiterAck",
    status: "pending",
    persona: "recruiter",
  },
  {
    id: "recruiter_no_outreach",
    labelKey: "placementChecklist.itemRecruiterNoOutreach",
    detailKey: "placementChecklist.detailRecruiterNoOutreach",
    status: "done",
    persona: "recruiter",
  },
];

const COMPANY_ITEMS: PlacementChecklistItem[] = [
  {
    id: "company_ack",
    labelKey: "placementChecklist.itemCompanyAck",
    detailKey: "placementChecklist.detailCompanyAck",
    status: "pending",
    persona: "company",
  },
  {
    id: "company_no_attestation",
    labelKey: "placementChecklist.itemCompanyNoAttestation",
    detailKey: "placementChecklist.detailCompanyNoAttestation",
    status: "blocked",
    persona: "company",
  },
];

export function getRecruiterPlacementChecklistDemo(): PlacementChecklistRecord {
  return {
    placement_id: "demo-placement-001",
    company_slug: "demo-acme",
    role_title: "Senior Frontend Engineer",
    items: [...SHARED_ITEMS, ...RECRUITER_ITEMS],
    disabled_actions: [
      { id: "attest", labelKey: "placementChecklist.actionAttestDisabled" },
      { id: "outreach", labelKey: "placementChecklist.actionOutreachDisabled" },
      { id: "approve", labelKey: "placementChecklist.actionApproveDisabled" },
    ],
  };
}

export function getCompanyPlacementChecklistDemo(): PlacementChecklistRecord {
  return {
    placement_id: "demo-placement-001",
    company_slug: "demo-acme",
    role_title: "Senior Frontend Engineer",
    items: [...SHARED_ITEMS, ...COMPANY_ITEMS],
    disabled_actions: [
      { id: "attest", labelKey: "placementChecklist.actionAttestDisabled" },
      { id: "confirm_hire", labelKey: "placementChecklist.actionConfirmHireDisabled" },
      { id: "approve", labelKey: "placementChecklist.actionApproveDisabled" },
    ],
  };
}
