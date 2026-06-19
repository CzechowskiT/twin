/** Deterministic board implementation tracker — feature milestone rows (demo only). */

export type ImplementationFeatureRow = {
  id: string;
  name_key: string;
  state: "pilot" | "demo" | "planned" | "blocked";
  next_key: string;
  dependency_key: string;
  boundary_key: string;
  owner: string;
  priority: "P0" | "P1" | "P2";
  blocked: boolean;
};

export type ImplementationTrackerRecord = {
  persistence_features: ImplementationFeatureRow[];
  queue_features: ImplementationFeatureRow[];
  feedback_features: ImplementationFeatureRow[];
  export_features: ImplementationFeatureRow[];
  intake_features: ImplementationFeatureRow[];
  email_features: ImplementationFeatureRow[];
  ats_features: ImplementationFeatureRow[];
  dependency_rows: ImplementationFeatureRow[];
  blocked_rows: ImplementationFeatureRow[];
  all_features: ImplementationFeatureRow[];
};

function row(
  id: string,
  name_key: string,
  state: ImplementationFeatureRow["state"],
  next_key: string,
  dependency_key: string,
  boundary_key: string,
  owner: string,
  priority: ImplementationFeatureRow["priority"],
  blocked: boolean,
): ImplementationFeatureRow {
  return { id, name_key, state, next_key, dependency_key, boundary_key, owner, priority, blocked };
}

export function getImplementationTrackerDemo(): ImplementationTrackerRecord {
  const persistence_features = [
    row(
      "persist_notes",
      "implementationTracker.featurePersistentNotes",
      "pilot",
      "implementationTracker.nextNotesAppendOnly",
      "implementationTracker.depPersonaAuth",
      "implementationTracker.boundaryNoOutbound",
      "Backend",
      "P0",
      false,
    ),
    row(
      "persist_tasks",
      "implementationTracker.featurePersistentTasks",
      "pilot",
      "implementationTracker.nextTasksOwnership",
      "implementationTracker.depNotesSchema",
      "implementationTracker.boundaryHumanDecision",
      "Backend",
      "P0",
      false,
    ),
    row(
      "candidate_role_status",
      "implementationTracker.featureCandidateRoleStatus",
      "demo",
      "implementationTracker.nextStatusEventLog",
      "implementationTracker.depApplicationEntity",
      "implementationTracker.boundaryAppendOnly",
      "Backend",
      "P0",
      false,
    ),
    row(
      "audit_event",
      "implementationTracker.featureAuditEvent",
      "pilot",
      "implementationTracker.nextAuditAppendOnly",
      "implementationTracker.depEventSchema",
      "implementationTracker.boundaryAppendOnly",
      "Backend",
      "P0",
      false,
    ),
    row(
      "visibility_preference",
      "implementationTracker.featureVisibilityPreference",
      "pilot",
      "implementationTracker.nextConsentScope",
      "implementationTracker.depTrustCenter",
      "implementationTracker.boundaryNoRevoke",
      "Trust",
      "P1",
      false,
    ),
  ];

  const queue_features = [
    row(
      "recruiter_queue_persistence",
      "implementationTracker.featureRecruiterQueuePersistence",
      "pilot",
      "implementationTracker.nextQueueSnapshot",
      "implementationTracker.depOperationalQueue",
      "implementationTracker.boundaryReadOnlyPreview",
      "Recruiter",
      "P0",
      false,
    ),
    row(
      "company_feedback_persistence",
      "implementationTracker.featureCompanyFeedbackPersistence",
      "pilot",
      "implementationTracker.nextFeedbackDraftStore",
      "implementationTracker.depNotesSchema",
      "implementationTracker.boundaryNoOutbound",
      "Company",
      "P0",
      false,
    ),
  ];

  const feedback_features = [...queue_features];

  const export_features = [
    row(
      "read_only_export",
      "implementationTracker.featureReadOnlyExport",
      "pilot",
      "implementationTracker.nextExportPreview",
      "implementationTracker.depAuditEvent",
      "implementationTracker.boundaryReadOnlyPreview",
      "Trust",
      "P1",
      false,
    ),
  ];

  const intake_features = [
    row(
      "request_intake_queue",
      "implementationTracker.featureRequestIntakeQueue",
      "pilot",
      "implementationTracker.nextIntakeAppend",
      "implementationTracker.depPersonaAuth",
      "implementationTracker.boundaryHumanDecision",
      "Backend",
      "P1",
      false,
    ),
  ];

  const email_features = [
    row(
      "email_draft_approval",
      "implementationTracker.featureEmailDraftApproval",
      "pilot",
      "implementationTracker.nextDraftReviewFlow",
      "implementationTracker.depSafeCommunication",
      "implementationTracker.boundaryNoOutbound",
      "Communication",
      "P0",
      true,
    ),
  ];

  const ats_features = [
    row(
      "ats_import_readonly",
      "implementationTracker.featureAtsImportReadonly",
      "pilot",
      "implementationTracker.nextAtsPreviewOnly",
      "implementationTracker.depIntegrationsReadiness",
      "implementationTracker.boundaryNoAtsSync",
      "Integrations",
      "P1",
      false,
    ),
  ];

  const dependency_rows = [
    row(
      "dep_persona_auth",
      "implementationTracker.depPersonaAuth",
      "blocked",
      "implementationTracker.nextAuthMiddleware",
      "implementationTracker.depNone",
      "implementationTracker.boundaryLaunchNoGo",
      "Platform",
      "P0",
      true,
    ),
    row(
      "dep_event_schema",
      "implementationTracker.depEventSchema",
      "planned",
      "implementationTracker.nextSchemaMigration",
      "implementationTracker.depPersonaAuth",
      "implementationTracker.boundaryAppendOnly",
      "Backend",
      "P0",
      false,
    ),
  ];

  const blocked_rows = [
    ...persistence_features.filter((f) => f.blocked),
    ...email_features.filter((f) => f.blocked),
    ...dependency_rows.filter((f) => f.blocked),
  ];

  const all_features = [
    ...persistence_features,
    ...queue_features,
    ...export_features,
    ...intake_features,
    ...email_features,
    ...ats_features,
  ];

  return {
    persistence_features,
    queue_features,
    feedback_features,
    export_features,
    intake_features,
    email_features,
    ats_features,
    dependency_rows,
    blocked_rows,
    all_features,
  };
}
