/** Deterministic audit event foundation demo samples. */

export type AuditEventSample = {
  id: string;
  event_type: string;
  actor_persona: string;
  actor_id: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, string>;
  source: string;
  external_side_effect: false;
  backend_write: true;
  created_at: string;
};

export type AuditEventFoundationRecord = {
  api_path: string;
  allowed_methods: string[];
  sample_events: AuditEventSample[];
  boundaries: string[];
  contract_fields: string[];
};

export function getAuditEventFoundationDemo(): AuditEventFoundationRecord {
  const sample_events: AuditEventSample[] = [
    {
      id: "demo-ae-001",
      event_type: "foundation_demo",
      actor_persona: "board",
      actor_id: "demo-board",
      target_type: "demo_target",
      target_id: "foundation-preview",
      metadata: { scope: "foundation", preview: "true" },
      source: "twin_internal",
      external_side_effect: false,
      backend_write: true,
      created_at: "2026-06-18T10:00:00Z",
    },
    {
      id: "demo-ae-002",
      event_type: "record_created",
      actor_persona: "recruiter",
      actor_id: "demo-recruiter",
      target_type: "work_item",
      target_id: "wi-preview-001",
      metadata: { item_kind: "note", scope: "recruiter" },
      source: "twin_internal",
      external_side_effect: false,
      backend_write: true,
      created_at: "2026-06-18T10:05:00Z",
    },
  ];

  return {
    api_path: "/api/v1/audit-events",
    allowed_methods: ["GET", "POST"],
    sample_events,
    boundaries: [
      "auditEventFoundation.boundaryAppendOnly",
      "auditEventFoundation.boundaryNoOutbound",
      "auditEventFoundation.boundaryAuthRequired",
      "auditEventFoundation.boundaryNoLegalClaim",
      "auditEventFoundation.boundaryInternalOnly",
    ],
    contract_fields: [
      "event_type",
      "actor_persona",
      "actor_id",
      "target_type",
      "target_id",
      "metadata",
      "source",
      "external_side_effect",
      "backend_write",
      "created_at",
    ],
  };
}
