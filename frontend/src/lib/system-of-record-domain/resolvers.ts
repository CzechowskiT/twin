/** TWIN system-of-record domain kernel — resolvers (never throw for invalid IDs). */

import { atsImportReadinessHref } from "@/lib/ats-import-readiness";
import { candidateCollaborationHref } from "@/lib/candidate-collaboration";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { candidateTrustHref } from "@/lib/candidate-trust";
import { jobPipelineHref } from "@/lib/job-pipeline";
import { candidateCommunicationHref } from "@/lib/safe-communication";
import { candidateTeamHref } from "@/lib/team-collaboration";
import {
  adaptAtsImportReadiness,
  adaptCandidateCollaboration,
  adaptCandidateProfile360,
  adaptCandidateSafeCommunication,
  adaptCandidateTrust,
  adaptCandidateTrustCenter,
  adaptCompanyHiringCockpit,
  adaptDecisionMemory,
  adaptJobPipeline,
  adaptRecruiterDailyCockpit,
} from "@/lib/system-of-record-domain/adapters";
import {
  TWIN_DEMO_CANDIDATE_PRIMARY_ID,
  TWIN_DEMO_ROLE_PRIMARY_ID,
  isTwinDemoRoleId,
} from "@/lib/system-of-record-domain/constants";
import { findTwinCandidateInSeed, getTwinDomainSeed } from "@/lib/system-of-record-domain/demo-seed";
import type {
  TwinCandidate,
  TwinDecisionMemoryView,
  TwinRole,
  TwinSystemOfRecordContext,
  TwinSystemOfRecordLink,
  TwinPersona,
} from "@/lib/system-of-record-domain/types";
import type { AtsImportReadinessRecord } from "@/lib/ats-import-readiness-demo-data";
import type { CandidateCollaborationRecord } from "@/lib/candidate-collaboration-demo-data";
import type { CandidateProfile360Record } from "@/lib/candidate-profile-360-demo-data";
import type { CandidateTrustRecord } from "@/lib/candidate-trust-demo-data";
import type { JobPipelineRecord } from "@/lib/job-pipeline-demo-data";
import type { CandidateSafeCommunicationRecord } from "@/lib/safe-communication-demo-data";
import type { CandidateTrustCenterRecord } from "@/lib/candidate-trust-center-demo-data";
import type { CompanyHiringCockpitRecord } from "@/lib/company-hiring-cockpit-demo-data";
import type { RecruiterDailyCockpitRecord } from "@/lib/recruiter-daily-operating-cockpit-demo-data";

export function resolveTwinCandidate(candidateId: string): TwinCandidate | null {
  return findTwinCandidateInSeed(candidateId);
}

export function resolveTwinRole(roleId: string): TwinRole | null {
  const trimmed = roleId.trim();
  if (!trimmed || !isTwinDemoRoleId(trimmed)) return null;
  return getTwinDomainSeed().role;
}

export function resolveCandidateProfile360(
  candidateId: string,
): CandidateProfile360Record | null {
  return adaptCandidateProfile360(candidateId);
}

export function resolveJobPipeline(roleId: string): JobPipelineRecord | null {
  return adaptJobPipeline(roleId);
}

export function resolveCandidateCollaboration(
  candidateId: string,
  roleId?: string,
): CandidateCollaborationRecord | null {
  return adaptCandidateCollaboration(candidateId, roleId);
}

export function resolveCandidateTrust(
  candidateId: string,
  roleId?: string,
): CandidateTrustRecord | null {
  return adaptCandidateTrust(candidateId, roleId);
}

export function resolveSafeCommunication(
  candidateId: string,
  roleId?: string,
): CandidateSafeCommunicationRecord | null {
  return adaptCandidateSafeCommunication(candidateId, roleId);
}

export function resolveAtsImportReadiness(importId: string): AtsImportReadinessRecord | null {
  return adaptAtsImportReadiness(importId);
}

export function resolveDecisionMemory(
  candidateId: string,
  roleId: string,
): TwinDecisionMemoryView | null {
  return adaptDecisionMemory(candidateId, roleId);
}

export function resolveRecruiterDailyCockpit(): RecruiterDailyCockpitRecord {
  return adaptRecruiterDailyCockpit();
}

export function resolveCompanyHiringCockpit(): CompanyHiringCockpitRecord {
  return adaptCompanyHiringCockpit();
}

export function resolveCandidateTrustCenter(
  candidateId?: string,
): CandidateTrustCenterRecord | null {
  return adaptCandidateTrustCenter(candidateId);
}

export function resolveSystemOfRecordLinks(
  persona: TwinPersona,
  context: TwinSystemOfRecordContext = {},
): readonly TwinSystemOfRecordLink[] {
  const candidateId = context.candidate_id ?? TWIN_DEMO_CANDIDATE_PRIMARY_ID;
  const roleId = context.role_id ?? TWIN_DEMO_ROLE_PRIMARY_ID;
  const surface = persona === "company" ? "company" : "recruiter";

  if (persona === "candidate" || persona === "investor") {
    return [];
  }

  const links: TwinSystemOfRecordLink[] = [
    {
      id: "link_profile_360",
      persona,
      module_family: "profile",
      href: candidateProfile360Href(candidateId, surface),
      title_key: "systemOfRecord.openProfile360Cta",
      status: "pilot",
      boundary_tags: ["pilot"],
    },
    {
      id: "link_pipeline",
      persona,
      module_family: "pipeline",
      href: jobPipelineHref(roleId, surface),
      title_key: "systemOfRecord.openPipelineCta",
      status: "pilot",
      boundary_tags: ["pilot", "human_decision_required"],
    },
    {
      id: "link_collaboration",
      persona,
      module_family: "collaboration",
      href: candidateCollaborationHref(candidateId, surface),
      title_key: "systemOfRecord.openCollaborationCta",
      status: "pilot",
      boundary_tags: ["pilot", "draft_only", "human_decision_required"],
    },
    {
      id: "link_trust",
      persona,
      module_family: "trust",
      href: candidateTrustHref(candidateId, surface),
      title_key: "systemOfRecord.openTrustCta",
      status: "pilot",
      boundary_tags: ["pilot"],
    },
    {
      id: "link_team",
      persona,
      module_family: "team",
      href: candidateTeamHref(candidateId, surface),
      title_key: "systemOfRecord.openTeamCta",
      status: "pilot",
      boundary_tags: ["pilot", "human_decision_required"],
    },
    {
      id: "link_communication",
      persona,
      module_family: "communication",
      href: candidateCommunicationHref(candidateId, surface),
      title_key: "systemOfRecord.openCommunicationCta",
      status: "pilot",
      boundary_tags: ["pilot", "draft_only", "no_outreach"],
    },
    {
      id: "link_ats",
      persona,
      module_family: "integrations",
      href: atsImportReadinessHref(surface),
      title_key: "systemOfRecord.openAtsReadinessCta",
      status: "pilot",
      boundary_tags: ["pilot", "no_ats_sync", "human_decision_required"],
    },
  ];

  return links;
}
