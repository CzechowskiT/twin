/**
 * Backward-compatible adapters — map kernel seed to existing module record shapes.
 * Modules can adopt these gradually without a risky full rewrite.
 */

import { getAtsImportReadinessDemo } from "@/lib/ats-import-readiness-demo-data";
import type { AtsImportReadinessRecord } from "@/lib/ats-import-readiness-demo-data";
import { getCandidateCollaborationDemo } from "@/lib/candidate-collaboration-demo-data";
import type { CandidateCollaborationRecord } from "@/lib/candidate-collaboration-demo-data";
import { getCandidateProfile360Demo } from "@/lib/candidate-profile-360-demo-data";
import type { CandidateProfile360Record } from "@/lib/candidate-profile-360-demo-data";
import { getCandidateTrustDemo } from "@/lib/candidate-trust-demo-data";
import type { CandidateTrustRecord } from "@/lib/candidate-trust-demo-data";
import { getJobPipelineDemo } from "@/lib/job-pipeline-demo-data";
import type { JobPipelineRecord } from "@/lib/job-pipeline-demo-data";
import {
  getCandidateSafeCommunicationDemo,
  getJobSafeCommunicationDemo,
} from "@/lib/safe-communication-demo-data";
import type {
  CandidateSafeCommunicationRecord,
  JobSafeCommunicationRecord,
} from "@/lib/safe-communication-demo-data";
import {
  TWIN_DEMO_CANDIDATE_PRIMARY_ID,
  TWIN_DEMO_ROLE_PRIMARY_ID,
  isTwinDemoAtsImportId,
  isTwinDemoCandidateId,
  isTwinDemoRoleId,
} from "@/lib/system-of-record-domain/constants";
import {
  findTwinCandidateInSeed,
  findTwinPipelineEntry,
  getTwinDomainSeed,
} from "@/lib/system-of-record-domain/demo-seed";
import {
  getCandidateTrustCenterDemo,
  type CandidateTrustCenterRecord,
} from "@/lib/candidate-trust-center-demo-data";
import {
  getCandidateControlCenterDemo,
  type CandidateControlCenterRecord,
} from "@/lib/candidate-control-center-demo-data";
import {
  getCandidateExportPreviewDemo,
  type CandidateExportPreviewRecord,
} from "@/lib/candidate-export-preview-demo-data";
import {
  getCompanyHiringCockpitDemo,
  type CompanyHiringCockpitRecord,
} from "@/lib/company-hiring-cockpit-demo-data";
import {
  getRecruiterDailyCockpitDemo,
  type RecruiterDailyCockpitRecord,
} from "@/lib/recruiter-daily-operating-cockpit-demo-data";
import type { TwinDecisionMemoryView } from "@/lib/system-of-record-domain/types";

export function adaptCandidateProfile360(
  candidateId: string,
): CandidateProfile360Record | null {
  if (!isTwinDemoCandidateId(candidateId) || candidateId !== TWIN_DEMO_CANDIDATE_PRIMARY_ID) {
    return null;
  }
  return getCandidateProfile360Demo();
}

export function adaptJobPipeline(roleId: string): JobPipelineRecord | null {
  if (!isTwinDemoRoleId(roleId)) return null;
  return getJobPipelineDemo();
}

export function adaptCandidateCollaboration(
  candidateId: string,
  roleId?: string,
): CandidateCollaborationRecord | null {
  const c = candidateId.trim();
  if (c !== TWIN_DEMO_CANDIDATE_PRIMARY_ID) return null;
  if (roleId !== undefined && roleId.trim() !== TWIN_DEMO_ROLE_PRIMARY_ID) return null;
  return getCandidateCollaborationDemo();
}

export function adaptCandidateTrust(
  candidateId: string,
  roleId?: string,
): CandidateTrustRecord | null {
  const c = candidateId.trim();
  if (c !== TWIN_DEMO_CANDIDATE_PRIMARY_ID) return null;
  if (roleId !== undefined && roleId.trim() !== TWIN_DEMO_ROLE_PRIMARY_ID) return null;
  return getCandidateTrustDemo();
}

export function adaptCandidateSafeCommunication(
  candidateId: string,
  roleId?: string,
): CandidateSafeCommunicationRecord | null {
  const c = candidateId.trim();
  if (c !== TWIN_DEMO_CANDIDATE_PRIMARY_ID) return null;
  if (roleId !== undefined && roleId.trim() !== TWIN_DEMO_ROLE_PRIMARY_ID) return null;
  return getCandidateSafeCommunicationDemo();
}

export function adaptJobSafeCommunication(
  roleId: string,
): JobSafeCommunicationRecord | null {
  if (!isTwinDemoRoleId(roleId)) return null;
  return getJobSafeCommunicationDemo();
}

export function adaptAtsImportReadiness(importId: string): AtsImportReadinessRecord | null {
  const trimmed = importId.trim();
  if (trimmed && !isTwinDemoAtsImportId(trimmed)) return null;
  return getAtsImportReadinessDemo();
}

export function adaptDecisionMemory(
  candidateId: string,
  roleId: string,
): TwinDecisionMemoryView | null {
  const c = candidateId.trim();
  const r = roleId.trim();
  if (c !== TWIN_DEMO_CANDIDATE_PRIMARY_ID || r !== TWIN_DEMO_ROLE_PRIMARY_ID) {
    return null;
  }
  const candidate = findTwinCandidateInSeed(c);
  const entry = findTwinPipelineEntry(c, r);
  if (!candidate || !entry) return null;
  const seed = getTwinDomainSeed();
  const events = seed.decision_memory_events.filter(
    (e) => e.candidate_id === c && e.role_id === r,
  );
  return {
    candidate_id: c,
    role_id: r,
    display_name: candidate.display_name,
    role_title: seed.role.title,
    events,
    pilot_labelled: true,
  };
}

export function adaptRecruiterDailyCockpit(): RecruiterDailyCockpitRecord {
  return getRecruiterDailyCockpitDemo();
}

export function adaptCompanyHiringCockpit(): CompanyHiringCockpitRecord {
  return getCompanyHiringCockpitDemo();
}

export function adaptCandidateTrustCenter(
  candidateId?: string,
): CandidateTrustCenterRecord | null {
  const trimmed = (candidateId ?? TWIN_DEMO_CANDIDATE_PRIMARY_ID).trim();
  if (!trimmed || trimmed !== TWIN_DEMO_CANDIDATE_PRIMARY_ID) return null;
  return getCandidateTrustCenterDemo();
}

export function adaptCandidateControlCenter(
  candidateId?: string,
): CandidateControlCenterRecord | null {
  const trimmed = (candidateId ?? TWIN_DEMO_CANDIDATE_PRIMARY_ID).trim();
  if (!trimmed || trimmed !== TWIN_DEMO_CANDIDATE_PRIMARY_ID) return null;
  return getCandidateControlCenterDemo();
}

export function adaptCandidateExportPreview(
  candidateId?: string,
): CandidateExportPreviewRecord | null {
  const trimmed = (candidateId ?? TWIN_DEMO_CANDIDATE_PRIMARY_ID).trim();
  if (!trimmed || trimmed !== TWIN_DEMO_CANDIDATE_PRIMARY_ID) return null;
  return getCandidateExportPreviewDemo();
}
