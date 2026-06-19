/** Deterministic first working persistence plan — backend rollout sequence (spec only). */

export type BackendSequenceStep = {
  step: number;
  title_key: string;
  detail_key: string;
  owner: string;
  gate_key: string;
};

export type FirstWorkingPersistencePlanRecord = {
  backend_sequence: BackendSequenceStep[];
  entity_targets: string[];
  scope_boundaries: string[];
  deferred_actions: string[];
  migration_gates: string[];
  dependency_order: string[];
  verification_checklist: string[];
  no_backend_routes: string[];
};

export function getFirstWorkingPersistencePlanDemo(): FirstWorkingPersistencePlanRecord {
  const backend_sequence: BackendSequenceStep[] = [
    {
      step: 1,
      title_key: "firstWorkingPersistencePlan.seq1Title",
      detail_key: "firstWorkingPersistencePlan.seq1Detail",
      owner: "Backend",
      gate_key: "firstWorkingPersistencePlan.gateAuthReview",
    },
    {
      step: 2,
      title_key: "firstWorkingPersistencePlan.seq2Title",
      detail_key: "firstWorkingPersistencePlan.seq2Detail",
      owner: "Backend",
      gate_key: "firstWorkingPersistencePlan.gateAuditSchema",
    },
    {
      step: 3,
      title_key: "firstWorkingPersistencePlan.seq3Title",
      detail_key: "firstWorkingPersistencePlan.seq3Detail",
      owner: "Backend",
      gate_key: "firstWorkingPersistencePlan.gateNotesAppendOnly",
    },
    {
      step: 4,
      title_key: "firstWorkingPersistencePlan.seq4Title",
      detail_key: "firstWorkingPersistencePlan.seq4Detail",
      owner: "Backend",
      gate_key: "firstWorkingPersistencePlan.gateTaskOwnership",
    },
    {
      step: 5,
      title_key: "firstWorkingPersistencePlan.seq5Title",
      detail_key: "firstWorkingPersistencePlan.seq5Detail",
      owner: "Backend",
      gate_key: "firstWorkingPersistencePlan.gateStatusEvents",
    },
    {
      step: 6,
      title_key: "firstWorkingPersistencePlan.seq6Title",
      detail_key: "firstWorkingPersistencePlan.seq6Detail",
      owner: "Backend",
      gate_key: "firstWorkingPersistencePlan.gateVisibilityScope",
    },
    {
      step: 7,
      title_key: "firstWorkingPersistencePlan.seq7Title",
      detail_key: "firstWorkingPersistencePlan.seq7Detail",
      owner: "Backend",
      gate_key: "firstWorkingPersistencePlan.gateQueueSnapshot",
    },
    {
      step: 8,
      title_key: "firstWorkingPersistencePlan.seq8Title",
      detail_key: "firstWorkingPersistencePlan.seq8Detail",
      owner: "Backend",
      gate_key: "firstWorkingPersistencePlan.gateFeedbackDraft",
    },
    {
      step: 9,
      title_key: "firstWorkingPersistencePlan.seq9Title",
      detail_key: "firstWorkingPersistencePlan.seq9Detail",
      owner: "Backend",
      gate_key: "firstWorkingPersistencePlan.gateExportPreview",
    },
    {
      step: 10,
      title_key: "firstWorkingPersistencePlan.seq10Title",
      detail_key: "firstWorkingPersistencePlan.seq10Detail",
      owner: "Backend",
      gate_key: "firstWorkingPersistencePlan.gateIntakeAppend",
    },
  ];

  return {
    backend_sequence,
    entity_targets: [
      "firstWorkingPersistencePlan.entityNote",
      "firstWorkingPersistencePlan.entityTask",
      "firstWorkingPersistencePlan.entityApplication",
      "firstWorkingPersistencePlan.entityPipelineStatus",
      "firstWorkingPersistencePlan.entityAuditEvent",
      "firstWorkingPersistencePlan.entityConsent",
      "firstWorkingPersistencePlan.entityQueueSnapshot",
      "firstWorkingPersistencePlan.entityFeedbackDraft",
    ],
    scope_boundaries: [
      "firstWorkingPersistencePlan.boundaryAppendOnly",
      "firstWorkingPersistencePlan.boundaryNoOutbound",
      "firstWorkingPersistencePlan.boundaryHumanDecision",
      "firstWorkingPersistencePlan.boundaryPersonaScoped",
      "firstWorkingPersistencePlan.boundaryDemoSafePreview",
    ],
    deferred_actions: [
      "firstWorkingPersistencePlan.deferEmailSend",
      "firstWorkingPersistencePlan.deferAtsWriteback",
      "firstWorkingPersistencePlan.deferCalendarSync",
      "firstWorkingPersistencePlan.deferAutoApply",
      "firstWorkingPersistencePlan.deferDeleteRevoke",
    ],
    migration_gates: [
      "firstWorkingPersistencePlan.migrationGate1",
      "firstWorkingPersistencePlan.migrationGate2",
      "firstWorkingPersistencePlan.migrationGate3",
      "firstWorkingPersistencePlan.migrationGate4",
      "firstWorkingPersistencePlan.migrationGate5",
    ],
    dependency_order: [
      "firstWorkingPersistencePlan.depOrder1",
      "firstWorkingPersistencePlan.depOrder2",
      "firstWorkingPersistencePlan.depOrder3",
      "firstWorkingPersistencePlan.depOrder4",
      "firstWorkingPersistencePlan.depOrder5",
    ],
    verification_checklist: [
      "firstWorkingPersistencePlan.verifyAuthScope",
      "firstWorkingPersistencePlan.verifyAppendOnly",
      "firstWorkingPersistencePlan.verifyNoOutbound",
      "firstWorkingPersistencePlan.verifyAuditTrail",
      "firstWorkingPersistencePlan.verifyRollbackPlan",
    ],
    no_backend_routes: [
      "firstWorkingPersistencePlan.noRouteNotes",
      "firstWorkingPersistencePlan.noRouteTasks",
      "firstWorkingPersistencePlan.noRouteQueue",
      "firstWorkingPersistencePlan.noRouteExport",
      "firstWorkingPersistencePlan.noRouteIntake",
    ],
  };
}
