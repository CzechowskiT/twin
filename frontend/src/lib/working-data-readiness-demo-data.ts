/** Deterministic working data readiness — entity and source mapping (demo only). */

export type DomainEntity = {
  id: string;
  name_key: string;
  demo_only: boolean;
  persistence_candidate: boolean;
};

export type DemoSource = {
  id: string;
  label_key: string;
  route: string;
  status: "pilot" | "demo" | "read_only";
};

export type WorkingDataReadinessRecord = {
  entities: DomainEntity[];
  demo_sources: DemoSource[];
  persistence_candidates: string[];
  unsafe_deferrals: string[];
  backend_boundaries: string[];
  audit_preview_events: string[];
  implementation_steps: string[];
};

export function getWorkingDataReadinessDemo(): WorkingDataReadinessRecord {
  return {
    entities: [
      { id: "candidate", name_key: "workingDataReadiness.entityCandidate", demo_only: false, persistence_candidate: true },
      { id: "role", name_key: "workingDataReadiness.entityRole", demo_only: false, persistence_candidate: true },
      { id: "application", name_key: "workingDataReadiness.entityApplication", demo_only: true, persistence_candidate: true },
      { id: "match", name_key: "workingDataReadiness.entityMatch", demo_only: true, persistence_candidate: false },
      { id: "pipeline_status", name_key: "workingDataReadiness.entityPipelineStatus", demo_only: true, persistence_candidate: true },
      { id: "note", name_key: "workingDataReadiness.entityNote", demo_only: true, persistence_candidate: true },
      { id: "task", name_key: "workingDataReadiness.entityTask", demo_only: true, persistence_candidate: true },
      { id: "scorecard", name_key: "workingDataReadiness.entityScorecard", demo_only: true, persistence_candidate: false },
      { id: "consent", name_key: "workingDataReadiness.entityConsent", demo_only: true, persistence_candidate: true },
      { id: "audit_event", name_key: "workingDataReadiness.entityAuditEvent", demo_only: true, persistence_candidate: true },
    ],
    demo_sources: [
      { id: "trust_center", label_key: "workingDataReadiness.sourceTrustCenter", route: "/candidate/trust", status: "pilot" },
      { id: "profile360", label_key: "workingDataReadiness.sourceProfile360", route: "/recruiter/candidates/demo-candidate-001/profile-360", status: "demo" },
      { id: "daily_cockpit", label_key: "workingDataReadiness.sourceDailyCockpit", route: "/recruiter/daily-cockpit", status: "pilot" },
      { id: "trust_queue", label_key: "workingDataReadiness.sourceTrustQueue", route: "/recruiter/trust-review-queue", status: "pilot" },
      { id: "hiring_cockpit", label_key: "workingDataReadiness.sourceHiringCockpit", route: "/company/hiring-cockpit", status: "pilot" },
      { id: "job_pipeline", label_key: "workingDataReadiness.sourceJobPipeline", route: "/recruiter/jobs/demo-role-001/pipeline", status: "demo" },
    ],
    persistence_candidates: [
      "workingDataReadiness.persistNotes",
      "workingDataReadiness.persistTasks",
      "workingDataReadiness.persistStatuses",
      "workingDataReadiness.persistOwnership",
      "workingDataReadiness.persistComments",
      "workingDataReadiness.persistChecklist",
      "workingDataReadiness.persistAuditAppend",
    ],
    unsafe_deferrals: [
      "workingDataReadiness.deferEmailSend",
      "workingDataReadiness.deferAtsWriteback",
      "workingDataReadiness.deferDeleteRevoke",
      "workingDataReadiness.deferLegalRequests",
      "workingDataReadiness.deferKycProvider",
    ],
    backend_boundaries: [
      "workingDataReadiness.boundaryPersonaAuth",
      "workingDataReadiness.boundaryAppendOnlyAudit",
      "workingDataReadiness.boundaryNoOutbound",
      "workingDataReadiness.boundaryDemoSafePreview",
    ],
    audit_preview_events: [
      "workingDataReadiness.auditNoteCreated",
      "workingDataReadiness.auditTaskUpdated",
      "workingDataReadiness.auditStatusChanged",
      "workingDataReadiness.auditConsentViewed",
      "workingDataReadiness.auditQueueReviewed",
    ],
    implementation_steps: [
      "workingDataReadiness.implStep1",
      "workingDataReadiness.implStep2",
      "workingDataReadiness.implStep3",
      "workingDataReadiness.implStep4",
      "workingDataReadiness.implStep5",
    ],
  };
}
