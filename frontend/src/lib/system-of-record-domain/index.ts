/** TWIN system-of-record domain kernel — public API. */

export {
  TWIN_DEMO_ATS_IMPORT_ID,
  TWIN_DEMO_CANDIDATE_IDS,
  TWIN_DEMO_CANDIDATE_PRIMARY_ID,
  TWIN_DEMO_ROLE_PRIMARY_ID,
  isTwinDemoAtsImportId,
  isTwinDemoCandidateId,
  isTwinDemoRoleId,
} from "@/lib/system-of-record-domain/constants";

export {
  findTwinCandidateInSeed,
  findTwinPipelineEntry,
  getTwinDomainSeed,
} from "@/lib/system-of-record-domain/demo-seed";

export {
  adaptAtsImportReadiness,
  adaptCandidateCollaboration,
  adaptCandidateProfile360,
  adaptCandidateSafeCommunication,
  adaptCandidateTrust,
  adaptCandidateTrustCenter,
  adaptCandidateControlCenter,
  adaptCandidateExportPreview,
  adaptCandidateCorrectionRequest,
  adaptCompanyHiringCockpit,
  adaptDecisionMemory,
  adaptJobPipeline,
  adaptJobSafeCommunication,
  adaptRecruiterDailyCockpit,
} from "@/lib/system-of-record-domain/adapters";

export {
  resolveAtsImportReadiness,
  resolveCandidateCollaboration,
  resolveCandidateProfile360,
  resolveCandidateTrust,
  resolveCandidateTrustCenter,
  resolveCandidateControlCenter,
  resolveCandidateExportPreview,
  resolveCandidateCorrectionRequest,
  resolveCompanyHiringCockpit,
  resolveDecisionMemory,
  resolveJobPipeline,
  resolveRecruiterDailyCockpit,
  resolveSafeCommunication,
  resolveSystemOfRecordLinks,
  resolveTwinCandidate,
  resolveTwinRole,
} from "@/lib/system-of-record-domain/resolvers";

export type {
  TwinApplication,
  TwinAtsImportRecord,
  TwinBoundaryTag,
  TwinCandidate,
  TwinCommunicationDraft,
  TwinConsentRecord,
  TwinContactHistoryEvent,
  TwinDecisionMemoryEvent,
  TwinDecisionMemoryView,
  TwinDomainSeed,
  TwinEvidenceItem,
  TwinFeedback,
  TwinFitLabel,
  TwinMatch,
  TwinModuleStatus,
  TwinNote,
  TwinPersona,
  TwinPipelineEntry,
  TwinPipelineStage,
  TwinPipelineStageId,
  TwinRole,
  TwinScorecard,
  TwinScorecardCriterion,
  TwinSystemOfRecordContext,
  TwinSystemOfRecordLink,
  TwinTeamTask,
} from "@/lib/system-of-record-domain/types";

export type { TwinDemoCandidateId } from "@/lib/system-of-record-domain/constants";
